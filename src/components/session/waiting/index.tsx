import { toast } from '@heroui/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import React, { useState } from 'react'

import {
  ActionRow,
  BracketButton,
  ConfirmDialog,
  ForceRoundButton,
  NotifySection,
  ProgressText,
  SegmentDivider,
  SegmentedActions,
  WaitingContainer,
} from './elements'
import BracketView from '@components/bracket-view'
import { FilterClosingSoonBadge, SoloVoterHint } from '@components/session/elements'
import Share from '@components/share'
import { closeRound, hasErrorCode, hasStatusCode } from '@services/api'
import { ChoicesMap, ErrorCode, SessionData, User } from '@types'
import { isSoloVoter } from '@utils/users'

export interface WaitingPhaseProps {
  sessionId: string
  session: SessionData
  // Unread until the push notify control lands here; the parent already supplies it.
  currentUser: User
  choices: ChoicesMap
}

const WaitingPhase = ({ sessionId, session, choices }: WaitingPhaseProps): React.ReactNode => {
  const queryClient = useQueryClient()
  const [bracketOpen, setBracketOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [hasShared, setHasShared] = useState(false)

  const currentRound = session.currentRound

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

      {/* Notification opt-in grouped together — filled in when push lands */}
      <NotifySection>{null}</NotifySection>

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
