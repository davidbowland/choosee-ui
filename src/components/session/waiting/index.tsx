import { toast } from '@heroui/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import React, { useEffect, useState } from 'react'

import { isFinalRound } from '../helpers'
import {
  ActionRow,
  BracketButton,
  ConfirmDialog,
  ForceRoundButton,
  NotifyAuthGate,
  NotifyCheckbox,
  NotifySection,
  ProgressText,
  SegmentDivider,
  SegmentedActions,
  WaitingContainer,
} from './elements'
import { useAuthContext } from '@components/auth-context'
import BracketView from '@components/bracket-view'
import { FilterClosingSoonBadge, SoloVoterHint } from '@components/session/elements'
import Share from '@components/share'
import { closeRound, hasErrorCode, hasStatusCode, subscribeToRound } from '@services/api'
import { ChoicesMap, ErrorCode, SessionData, User } from '@types'
import { isSoloVoter } from '@utils/users'

export interface WaitingPhaseProps {
  sessionId: string
  session: SessionData
  currentUser: User
  choices: ChoicesMap
}

const WaitingPhase = ({ sessionId, session, currentUser, choices }: WaitingPhaseProps): React.ReactNode => {
  const queryClient = useQueryClient()
  const { isSignedIn, handleSignIn } = useAuthContext()
  const [bracketOpen, setBracketOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [hasShared, setHasShared] = useState(false)

  const currentRound = session.currentRound
  const nextRound = currentRound + 1
  const alreadySubscribed = currentUser.subscribedRounds.includes(nextRound)

  // 'unavailable' is a terminal failure for this identity (403/400) — the toggle stays
  // disabled because the same request cannot start succeeding.
  const [notifyChecked, setNotifyChecked] = useState(alreadySubscribed)
  const [notifyStatus, setNotifyStatus] = useState<'idle' | 'saving' | 'subscribed' | 'unavailable'>(
    alreadySubscribed ? 'subscribed' : 'idle',
  )

  // The waiting screen re-renders across rounds, so lazy useState initializers alone
  // would leave a stale toggle when a new round opens. Re-derive from the server data.
  useEffect(() => {
    setNotifyChecked(alreadySubscribed)
    setNotifyStatus(alreadySubscribed ? 'subscribed' : 'idle')
  }, [nextRound, alreadySubscribed])

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

  const handleNotifyToggle = async (): Promise<void> => {
    setNotifyChecked(true)
    setNotifyStatus('saving')
    try {
      const updatedUser = await subscribeToRound(sessionId, currentRound + 1, currentUser.userId)
      setNotifyStatus('subscribed')
      // Fold the authoritative subscribedRounds in rather than waiting up to 30s for the
      // users poll, so a remount in between re-seeds as subscribed instead of idle.
      queryClient.setQueryData<User[]>(['users', sessionId], (old) =>
        old?.map((u) => (u.userId === updatedUser.userId ? updatedUser : u)),
      )
    } catch (err) {
      setNotifyChecked(false)
      // A 403 (this name is claimed by another Google account) and a 400 (no verified
      // address available) are both permanent for this identity — the same request will
      // fail identically forever. Leave the toggle disabled rather than re-arming it to
      // invite a futile retry, and don't instruct an action the UI cannot perform: there
      // is no in-app way to re-pick an identity once the session cookie is set.
      if (hasStatusCode(err, 403)) {
        setNotifyStatus('unavailable')
        toast.danger("Someone else claimed this name with their Google account, so we can't email you.")
        return
      }
      if (hasStatusCode(err, 400)) {
        setNotifyStatus('unavailable')
        toast.danger("Your Google account has no verified email address, so we can't send reminders.")
        return
      }
      setNotifyStatus('idle')
      toast.danger("Couldn't turn on reminders. Please try again.")
    }
  }

  const solo = isSoloVoter(session)
  // On the last round there is no next round to be notified about — closing it
  // decides the winner, so the reminder has to promise that instead.
  const reminderEvent = isFinalRound(session) ? 'a winner is chosen' : 'the next round opens'

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
      <NotifySection>
        {isSignedIn ? (
          <NotifyCheckbox
            checked={notifyChecked}
            disabled={notifyStatus !== 'idle'}
            isSaving={notifyStatus === 'saving'}
            onChange={handleNotifyToggle}
            reminderEvent={reminderEvent}
            subscribed={notifyStatus === 'subscribed'}
          />
        ) : (
          <NotifyAuthGate onSignIn={handleSignIn} reminderEvent={reminderEvent} />
        )}
      </NotifySection>

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
