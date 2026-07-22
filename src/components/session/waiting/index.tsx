import { toast } from '@heroui/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import React, { useState } from 'react'

import {
  ActionRow,
  BracketButton,
  ConfirmDialog,
  ConsentCheckbox,
  ForceRoundButton,
  NotifyAuthGate,
  NotifyCheckbox,
  NotifySection,
  PhoneInput,
  ProgressText,
  SegmentDivider,
  SegmentedActions,
  VerificationHint,
  WaitingContainer,
} from './elements'
import { useAuthContext } from '@components/auth-context'
import BracketView from '@components/bracket-view'
import { FilterClosingSoonBadge, SoloVoterHint } from '@components/session/elements'
import Share from '@components/share'
import { usePhoneInput } from '@hooks/use-phone-input'
import { useProfile } from '@hooks/useProfile'
import { closeRound, registerPhone, subscribeToRound, hasErrorCode } from '@services/api'
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
  const {
    profile,
    isLoading: profileLoading,
    isError: profileError,
    setProfile,
    refetch: refetchProfile,
  } = useProfile()
  const [bracketOpen, setBracketOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [notifyChecked, setNotifyChecked] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)
  const [hasShared, setHasShared] = useState(false)
  const phoneInput = usePhoneInput()
  const [notifyStatus, setNotifyStatus] = useState<'idle' | 'saving' | 'subscribed'>('idle')

  const currentRound = session.currentRound
  const hasPhone = profile?.phoneLast4 != null

  const closeMutation = useMutation({
    mutationFn: () => closeRound(sessionId, currentRound),
    onSuccess: (updatedSession) => {
      setConfirmOpen(false)
      queryClient.setQueryData<SessionData>(['session', sessionId], updatedSession)
    },
    onError: (err) => {
      setConfirmOpen(false)
      if (hasErrorCode(err, ErrorCode.ROUND_NOT_CURRENT)) {
        toast.info('Round already advanced.')
        void queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
        return
      }
      toast.danger('Failed to advance round. Please try again.')
    },
  })

  const savePhoneAndSubscribe = async (phone?: string): Promise<void> => {
    setNotifyStatus('saving')
    try {
      if (phone) {
        const updated = await registerPhone(phone, true)
        setProfile(updated)
      }
      await subscribeToRound(sessionId, currentRound + 1, currentUser.userId, isSignedIn)
      setNotifyStatus('subscribed')
    } catch {
      setNotifyChecked(false)
      setNotifyStatus('idle')
      void queryClient.invalidateQueries({ queryKey: ['profile'] })
    }
  }

  const handleNotifyToggle = async (): Promise<void> => {
    if (notifyChecked) {
      setNotifyChecked(false)
      return
    }
    // Don't act until we know the profile — otherwise a user with an existing number
    // would be shown the (write-once) registration form and hit a 409 on submit.
    if (!profile) {
      // If the profile failed to load, tell the user and retry so a later tap can work,
      // rather than silently doing nothing.
      if (profileError) {
        toast.danger("Couldn't load your reminder settings. Please try again.")
        refetchProfile()
      }
      return
    }
    setNotifyChecked(true)
    if (hasPhone) {
      await savePhoneAndSubscribe()
    }
  }

  const handlePhoneSubmit = async (): Promise<void> => {
    phoneInput.showError()
    if (!phoneInput.isValid || !consentChecked) return
    await savePhoneAndSubscribe(phoneInput.value)
  }

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
      <NotifySection>
        {isSignedIn ? (
          <>
            <NotifyCheckbox
              checked={notifyChecked}
              disabled={notifyStatus === 'subscribed' || profileLoading}
              onChange={handleNotifyToggle}
              subscribed={notifyStatus === 'subscribed'}
            />
            {notifyChecked && profile != null && !hasPhone && notifyStatus !== 'subscribed' && (
              <>
                <ConsentCheckbox checked={consentChecked} onChange={setConsentChecked} />
                <PhoneInput
                  error={phoneInput.error}
                  isLoading={notifyStatus === 'saving'}
                  isValid={phoneInput.isValid && consentChecked}
                  onChange={phoneInput.onChange}
                  onSubmit={handlePhoneSubmit}
                  value={phoneInput.value}
                />
              </>
            )}
            {notifyStatus === 'subscribed' && profile?.verified === false && (
              <VerificationHint last4={profile.phoneLast4} />
            )}
          </>
        ) : (
          <NotifyAuthGate onSignIn={handleSignIn} />
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
