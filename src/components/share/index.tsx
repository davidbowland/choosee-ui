import { ApiError } from 'aws-amplify/api'
import React, { useState } from 'react'

import { CopyUrlButton, QrCode, ShareModal, SmsAuthGate, SmsForm, StatusMessage } from './elements'
import { useAuthContext } from '@components/auth-context'
import { usePhoneInput } from '@hooks/use-phone-input'
import { parseApiMessage, shareSession } from '@services/api'

export interface ShareProps {
  sessionId: string
  userId: string
}

const Share = ({ sessionId, userId }: ShareProps): React.ReactNode => {
  const { isSignedIn, handleSignIn } = useAuthContext()
  const [copied, setCopied] = useState(false)
  const phone = usePhoneInput()
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const sessionUrl = `${typeof window === 'undefined' ? '' : window.location.origin}/s/${sessionId}`

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(sessionUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setErrorMsg('Failed to copy URL to clipboard.')
      setStatus('error')
    }
  }

  const handleSendSms = async (): Promise<void> => {
    phone.showError()
    if (!phone.isValid || status === 'sending') return
    setStatus('sending')
    setErrorMsg('')
    try {
      await shareSession(sessionId, userId, phone.value)
      setStatus('sent')
      phone.reset()
    } catch (err: unknown) {
      setStatus('error')
      if (err instanceof ApiError && err.response) {
        const { statusCode, body } = err.response
        if (statusCode === 401) {
          setErrorMsg('You must be signed in to send SMS invites.')
          return
        }
        if (statusCode === 403) {
          setErrorMsg(parseApiMessage(body, 'Phone number mismatch with your Google account.'))
          return
        }
        if (statusCode === 429) {
          setErrorMsg('Rate limit reached. Please try again later.')
          return
        }
        if (statusCode === 400) {
          setErrorMsg(parseApiMessage(body, 'Bad request. Please try again.'))
          return
        }
      }
      setErrorMsg('Failed to send invite. Please try again.')
    }
  }

  return (
    <ShareModal>
      <CopyUrlButton copied={copied} onPress={handleCopy} />
      <QrCode url={sessionUrl} />
      {isSignedIn ? (
        <>
          <SmsForm
            error={phone.error}
            isSending={status === 'sending'}
            isValid={phone.isValid}
            onChange={phone.onChange}
            onSend={handleSendSms}
            phone={phone.value}
          />
          <StatusMessage error={errorMsg} status={status} />
        </>
      ) : (
        <SmsAuthGate onSignIn={handleSignIn} />
      )}
    </ShareModal>
  )
}

export default Share
