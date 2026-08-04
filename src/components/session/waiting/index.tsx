import { toast } from '@heroui/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import React, { useEffect, useState } from 'react'

import { isFinalRound } from '../helpers'
import {
  ActionRow,
  BracketButton,
  ConfirmDialog,
  ForceRoundButton,
  IosNotifySheet,
  NotifyBlocked,
  NotifyCheckbox,
  NotifyRetryMessage,
  NotifySection,
  ProgressText,
  SegmentDivider,
  SegmentedActions,
  TurnOffLink,
  WaitingContainer,
} from './elements'
import BracketView from '@components/bracket-view'
import { FilterClosingSoonBadge, SoloVoterHint } from '@components/session/elements'
import Share from '@components/share'
import { closeRound, hasErrorCode, hasStatusCode } from '@services/api'
import { isSubscribedToPush, subscribeToPush, unsubscribeFromPush } from '@services/push'
import { ChoicesMap, ErrorCode, SessionData, User } from '@types'
import { PushCapability, readCapabilityEnv, resolvePushCapability } from '@utils/push-capability'
import { isSoloVoter } from '@utils/users'

export interface WaitingPhaseProps {
  sessionId: string
  session: SessionData
  currentUser: User
  choices: ChoicesMap
}

const WaitingPhase = ({ sessionId, session, currentUser, choices }: WaitingPhaseProps): React.ReactNode => {
  const queryClient = useQueryClient()
  const [bracketOpen, setBracketOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [hasShared, setHasShared] = useState(false)
  // null until the device has been resolved. Nothing is rendered in the meantime: `isSubscribedToPush`
  // waits on the service worker, and guessing a state before that answer arrives would flash a
  // sentence — most likely "This browser can't send notifications" — that is wrong for most devices.
  const [capability, setCapability] = useState<PushCapability | null>(null)
  const [isIos, setIsIos] = useState(false)
  const [notifyStatus, setNotifyStatus] = useState<'idle' | 'saving' | 'failed-on' | 'failed-off'>('idle')
  const [iosSheetOpen, setIosSheetOpen] = useState(false)

  const currentRound = session.currentRound
  const reminderEvent = isFinalRound(session) ? 'a winner is chosen' : 'the next round opens'

  // Resolved on mount, and never prompting: isSubscribedToPush only reads. A permission prompt on
  // load is iOS-hostile and trains people to deny before they know what they are being offered.
  useEffect(() => {
    let cancelled = false
    const env = readCapabilityEnv()
    void isSubscribedToPush()
      // A read that throws is not proof of a subscription, and the honest answer to "do you already
      // hold one?" under uncertainty is no — which is also what the caller assumed before asking.
      .catch(() => false)
      .then((isSubscribed) => {
        if (!cancelled) {
          setIsIos(env.isIos)
          setCapability(resolvePushCapability(env, isSubscribed))
        }
      })
    return () => {
      cancelled = true
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

  const solo = isSoloVoter(session)

  return (
    <WaitingContainer>
      {solo && !hasShared && <SoloVoterHint />}
      {session.filterClosingSoon && <FilterClosingSoonBadge />}

      <ProgressText
        finished={session.votersSubmitted}
        subtitle={solo ? 'Wrapping up this round...' : 'Waiting for others to finish voting...'}
        total={session.voterCount}
      />

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
        {!solo && <ForceRoundButton isLoading={closeMutation.isPending} onPress={() => setConfirmOpen(true)} />}
      </ActionRow>

      {confirmOpen && (
        <ConfirmDialog
          isLoading={closeMutation.isPending}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => closeMutation.mutate()}
          open={confirmOpen}
        />
      )}

      <BracketView choices={choices} onClose={() => setBracketOpen(false)} open={bracketOpen} session={session} />
    </WaitingContainer>
  )
}

export default WaitingPhase
