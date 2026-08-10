import { toast } from '@heroui/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import React, { useEffect, useState } from 'react'

import { firstUnvotedIndex, isFinalRound } from '../helpers'
import {
  ActionRow,
  BracketButton,
  ChangeCountLink,
  ConfirmDialog,
  FinishedRoundOneTitle,
  ForceRoundButton,
  IosNotifySheet,
  MoreVotersStepper,
  NextRoundButton,
  NotifyBlocked,
  NotifyCheckbox,
  NotifyRetryMessage,
  NotifySection,
  ProgressText,
  RosterLine,
  RoundOneQuestion,
  SegmentDivider,
  SegmentedActions,
  StartRoundNowLink,
  TurnOffLink,
  WaitForOthersButton,
  WaitingContainer,
  joinNames,
} from './elements'
import BracketView from '@components/bracket-view'
import { FilterClosingSoonBadge, SoloVoterHint } from '@components/session/elements'
import Share from '@components/share'
import { closeRound, hasErrorCode, hasStatusCode, setExpectedVoters } from '@services/api'
import { isSubscribedToPush, subscribeToPush, unsubscribeFromPush } from '@services/push'
import { ChoicesMap, ErrorCode, SessionData, User } from '@types'
import { PushCapability, readCapabilityEnv, resolvePushCapability } from '@utils/push-capability'
import { displayName, isSoloVoter } from '@utils/users'

// Mirrors the API's MAX_USERS_PER_SESSION, which is not on the wire. Nothing breaks if the two
// drift apart — the server still rejects anything above its own ceiling — but the stepper stops
// where the request would start failing, so the ceiling is a control that will not move rather
// than a 400 with no copy attached to it.
const MAX_EXPECTED_VOTERS = 20

export interface WaitingPhaseProps {
  sessionId: string
  session: SessionData
  currentUser: User
  choices: ChoicesMap
  users: User[]
}

const WaitingPhase = ({ sessionId, session, currentUser, choices, users }: WaitingPhaseProps): React.ReactNode => {
  const queryClient = useQueryClient()
  const [bracketOpen, setBracketOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [hasShared, setHasShared] = useState(false)
  const [stepperOpen, setStepperOpen] = useState(false)
  const [moreVoters, setMoreVoters] = useState(1)
  // null until the device has been resolved. Nothing is rendered in the meantime: `isSubscribedToPush`
  // waits on the service worker, and guessing a state before that answer arrives would flash a
  // sentence — most likely "This browser can't send notifications" — that is wrong for most devices.
  const [capability, setCapability] = useState<PushCapability | null>(null)
  const [isIos, setIsIos] = useState(false)
  const [notifyStatus, setNotifyStatus] = useState<'idle' | 'saving' | 'failed-on' | 'failed-off'>('idle')
  const [iosSheetOpen, setIosSheetOpen] = useState(false)

  const currentRound = session.currentRound
  // Round 1 is the lobby: it does not advance on its own until someone says how many to expect, so
  // this screen is where that question gets asked and where the round gets closed by hand. Every
  // later round behaves exactly as it does today.
  const isRoundOne = currentRound === 0
  const isArmed = isRoundOne && session.expectedVoters != null
  const nextLabel = isFinalRound(session) ? 'See the winner' : `Start round ${currentRound + 2}`

  // The roster names other people — that is what makes it unmisreadable as including you — so the
  // current user is filtered out and an empty result IS the solo voter.
  const otherNames = users.filter((user) => user.userId !== currentUser.userId).map(displayName)
  // Anyone who still has an unanswered matchup in this round would lose their votes if it closed now.
  const outstandingNames = users.filter((user) => firstUnvotedIndex(session, user) !== -1).map(displayName)

  const reminderEvent = isRoundOne
    ? session.voterCount <= 1
      ? 'someone else votes'
      : "everyone's voted"
    : isFinalRound(session)
      ? 'a winner is chosen'
      : 'the next round opens'

  // Resolved on mount, and never prompting: isSubscribedToPush only reads. A permission prompt on
  // load is iOS-hostile and trains people to deny before they know what they are being offered.
  useEffect(() => {
    let canceled = false
    const env = readCapabilityEnv()
    void isSubscribedToPush()
      // A read that throws is not proof of a subscription, and the honest answer to "do you already
      // hold one?" under uncertainty is no — which is also what the caller assumed before asking.
      .catch(() => false)
      .then((isSubscribed) => {
        if (!canceled) {
          setIsIos(env.isIos)
          setCapability(resolvePushCapability(env, isSubscribed))
        }
      })
    return () => {
      canceled = true
    }
  }, [])

  const handleNotifyToggle = async (): Promise<void> => {
    // iOS Safari outside standalone cannot be asked at all — Notification.requestPermission does not
    // exist there — so pressing through would do precisely nothing. Intercepting here is what turns
    // a dead switch into the one instruction that helps.
    if (capability === 'needs-install') {
      setIosSheetOpen(true)
      return
    }
    if (capability === 'subscribed') {
      // Flip only after the browser has actually let go. Setting it first meant a rejecting
      // unsubscribe left the UI claiming notifications were off while the device stayed subscribed
      // — the one lie this screen must not tell.
      try {
        await unsubscribeFromPush(sessionId, currentUser.userId)
        setCapability('ready')
        // Clear any earlier failure. Without this a retry that succeeds leaves the previous
        // "Couldn't turn off notifications" sitting under a switch that now reads unsubscribed.
        setNotifyStatus('idle')
      } catch {
        setNotifyStatus('failed-off')
      }
      return
    }

    setNotifyStatus('saving')
    // Every step inside subscribeToPush can reject — the VAPID fetch, pushManager.subscribe (Chrome
    // throws InvalidStateError when an existing subscription carries a different applicationServerKey),
    // and the POST. Without this the switch sits disabled on "Turning on notifications…" forever,
    // which is precisely the dead end READY_TIMEOUT_MS exists to prevent.
    const result = await subscribeToPush(sessionId, currentUser.userId).catch(() => 'unready' as const)
    if (result === 'subscribed') {
      setNotifyStatus('idle')
      setCapability('subscribed')
      return
    }
    // 'unready' is transient — keep the switch armed and say so.
    if (result === 'unready') {
      setNotifyStatus('failed-on')
      return
    }
    // 'dismissed' means the prompt was closed without a choice. Nothing is wrong, nothing needs
    // explaining, and nagging someone who just declined to decide is the wrong move — so drop
    // silently back to idle with the switch still offered.
    setNotifyStatus('idle')
    if (result === 'dismissed') {
      return
    }
    // 'denied' is terminal and 'unsupported' means the browser cannot. Both become the capability
    // itself — a static explanation with no control, because neither can be resolved from here.
    setCapability(result)
  }

  const closeMutation = useMutation({
    mutationFn: () => closeRound(sessionId, currentRound),
    onSuccess: (updatedSession) => {
      setConfirmOpen(false)
      queryClient.setQueryData<SessionData>(['session', sessionId], updatedSession)
    },
    onError: (err) => {
      setConfirmOpen(false)
      // These two are NOT the same and must not share copy. ROUND_NOT_CURRENT (400) means the
      // round really did advance, so there is nothing to retry. A 409 means the write lost a
      // race and was abandoned — and the session version is bumped by an ordinary vote
      // recording votersSubmitted, so the round has very likely NOT advanced. Saying it had
      // would strand the user believing a skip succeeded when nothing happened.
      if (hasErrorCode(err, ErrorCode.ROUND_NOT_CURRENT)) {
        toast.info("That round already ended — here's the current one.")
        void queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
        return
      }
      if (hasStatusCode(err, 409)) {
        toast.info('Someone else was updating this Choosee. Nothing changed — try again.')
        void queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
        return
      }
      toast.danger("Couldn't skip ahead. Please try again.")
    },
  })

  const expectedMutation = useMutation({
    mutationFn: (expectedVoters: number) => setExpectedVoters(sessionId, expectedVoters),
    onSuccess: (updatedSession) => {
      setStepperOpen(false)
      queryClient.setQueryData<SessionData>(['session', sessionId], updatedSession)
    },
    onError: (err) => {
      // The round moved under the write — the same pair closeMutation already handles, and the same
      // remedy: refresh and let the screen re-derive from whatever round is current now.
      if (hasErrorCode(err, ErrorCode.ROUND_NOT_CURRENT) || hasStatusCode(err, 409)) {
        toast.info("That round already ended — here's the current one.")
        void queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
        return
      }
      // A plain 400 is the server's own ceiling on the count. The stepper stops below it, so this
      // is the drift case — and "try again" would be a lie, because trying again cannot help.
      if (hasStatusCode(err, 400)) {
        toast.danger("That's more people than one Choosee can hold.")
        return
      }
      toast.danger("Couldn't save that. Please try again.")
    },
  })

  // Stays on the session's own count: this screen polls the session, and `solo` also picks the
  // subtitle sitting next to the total below, which is derived from the same snapshot. Reading the
  // two from different snapshots is how you end up with "waiting for others" over a total of one.
  const solo = isSoloVoter(session.voterCount, session.currentRound)

  // "Voted 1 / 1" is a full bar reporting that nothing has happened, at the one moment the screen
  // has to say the opposite. Round 1 alone drops it and keeps the invitation instead.
  const showProgress = !isRoundOne || isArmed || session.voterCount > 1
  // Armed, the bar measures against the number that was given; unarmed it measures who is here.
  // Later rounds never read the count — the server has stopped consulting it by then.
  const progressTotal = isArmed && session.expectedVoters != null ? session.expectedVoters : session.voterCount
  const stillMissing = Math.max(0, progressTotal - session.voterCount)
  const armedSubtitle = [
    otherNames.length > 0 ? `${joinNames(otherNames)} ${otherNames.length === 1 ? 'is' : 'are'} here.` : '',
    stillMissing > 0 ? `Waiting for ${stillMissing} more.` : '',
  ]
    .filter(Boolean)
    .join(' ')
  const outstandingSubtitle =
    outstandingNames.length > 0
      ? `${joinNames(outstandingNames)} ${outstandingNames.length === 1 ? 'is' : 'are'} still voting.`
      : ''
  const subtitle =
    (isArmed && armedSubtitle) ||
    (isRoundOne && outstandingSubtitle) ||
    (solo ? 'Wrapping up this round...' : 'Waiting for others to finish voting...')

  const morePhrase = moreVoters === 1 ? '1 more person has' : `${moreVoters} more people have`
  const stepperHelper = isFinalRound(session)
    ? `The winner is announced once ${morePhrase} voted.`
    : `Round ${currentRound + 2} starts once ${morePhrase} voted.`

  // Closing the round throws away the votes of anyone mid-matchup, so it asks first — and names
  // them, because "not everyone has voted" is what makes that decision impossible to weigh.
  const handleNextRound = (): void => {
    if (outstandingNames.length > 0) {
      setConfirmOpen(true)
      return
    }
    closeMutation.mutate()
  }

  return (
    <WaitingContainer>
      {solo && !hasShared && <SoloVoterHint />}
      {session.filterClosingSoon && <FilterClosingSoonBadge />}

      {showProgress && <ProgressText finished={session.votersSubmitted} subtitle={subtitle} total={progressTotal} />}

      {/* The end of round 1: nothing advances this round but a person, so the decision is the
          primary thing on the screen rather than a quiet link at the bottom of it. */}
      {isRoundOne &&
        (stepperOpen ? (
          <MoreVotersStepper
            helper={stepperHelper}
            isLoading={expectedMutation.isPending}
            max={Math.max(1, MAX_EXPECTED_VOTERS - session.voterCount)}
            onCancel={() => setStepperOpen(false)}
            onChange={setMoreVoters}
            onCommit={() => expectedMutation.mutate(session.voterCount + moreVoters)}
            value={moreVoters}
          />
        ) : isArmed ? (
          <ActionRow>
            <StartRoundNowLink
              isLoading={closeMutation.isPending}
              label={`${nextLabel} now`}
              onPress={handleNextRound}
            />
            <ChangeCountLink onPress={() => setStepperOpen(true)} />
          </ActionRow>
        ) : (
          <RoundOneQuestion
            roster={otherNames.length > 0 ? <RosterLine names={otherNames} /> : <FinishedRoundOneTitle />}
          >
            <WaitForOthersButton onPress={() => setStepperOpen(true)} />
            <NextRoundButton isLoading={closeMutation.isPending} label={nextLabel} onPress={handleNextRound} />
          </RoundOneQuestion>
        ))}

      {/* Notification opt-in grouped together */}
      {capability !== null && (
        <NotifySection>
          {capability === 'denied' && (
            <NotifyBlocked body="Turn them back on in your browser settings." title="Notifications are blocked" />
          )}
          {capability === 'unsupported' && (
            <NotifyBlocked
              // Naming the browser this device actually has is the whole value of the line. Safari
              // is the only one that can push on iOS; Chrome is the safe answer everywhere else.
              body={`Open Choosee in ${isIos ? 'Safari' : 'Chrome'} to turn them on.`}
              title="This browser can't send notifications"
            />
          )}
          {capability !== 'denied' && capability !== 'unsupported' && (
            <>
              <NotifyCheckbox
                disabled={notifyStatus === 'saving'}
                isFinal={isFinalRound(session)}
                isSaving={notifyStatus === 'saving'}
                onChange={() => void handleNotifyToggle()}
                reminderEvent={reminderEvent}
                subscribed={capability === 'subscribed'}
              />
              {capability === 'subscribed' && <TurnOffLink onPress={() => void handleNotifyToggle()} />}
              {notifyStatus === 'failed-on' && <NotifyRetryMessage action="on" />}
              {notifyStatus === 'failed-off' && <NotifyRetryMessage action="off" />}
            </>
          )}
        </NotifySection>
      )}

      <IosNotifySheet onClose={() => setIosSheetOpen(false)} open={iosSheetOpen} />

      {/* Tools grouped in a pill; the consequential skip sits apart as a quiet link */}
      <ActionRow>
        <SegmentedActions>
          <BracketButton onPress={() => setBracketOpen(true)} />
          <SegmentDivider />
          <div onClick={() => setHasShared(true)}>
            <Share sessionId={sessionId} variant="bare" />
          </div>
        </SegmentedActions>
        {/* Round 1 closes from its own card above, where the decision is the point of the screen.
            Later rounds keep the quiet link, because there it is genuinely exceptional. */}
        {!isRoundOne && <ForceRoundButton isLoading={closeMutation.isPending} onPress={() => setConfirmOpen(true)} />}
      </ActionRow>

      {confirmOpen && (
        <ConfirmDialog
          actionLabel={nextLabel}
          isLoading={closeMutation.isPending}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => closeMutation.mutate()}
          open={confirmOpen}
          // Only round 1 knows who it would be cutting off; later rounds keep today's unnamed copy.
          outstandingNames={isRoundOne ? outstandingNames : undefined}
        />
      )}

      <BracketView choices={choices} onClose={() => setBracketOpen(false)} open={bracketOpen} session={session} />
    </WaitingContainer>
  )
}

export default WaitingPhase
