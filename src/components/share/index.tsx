import React, { useState } from 'react'

import { CopyUrlButton, QrCode, ShareModal, SmsForm, StatusMessage } from './elements'
import { usePhoneInput } from '@hooks/use-phone-input'
import { shareSession } from '@services/api'

export interface ShareProps {
  sessionId: string
  userId: string
}

const Share = ({ sessionId, userId }: ShareProps): React.ReactNode => {
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
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { status?: number } }).response
        if (response?.status === 429) {
          setErrorMsg('Rate limit reached. Please try again later.')
          return
        }
      }
      setErrorMsg('Failed to send invite. Please try again.')
    }
  }

  return (
    <>
      <ShareModal>
        <CopyUrlButton copied={copied} onPress={handleCopy} />
        <QrCode url={sessionUrl} />
        <SmsForm
          error={phone.error}
          isSending={status === 'sending'}
          isValid={phone.isValid}
          onChange={phone.onChange}
          onSend={handleSendSms}
          phone={phone.value}
        />
        <StatusMessage error={errorMsg} status={status} />
      </ShareModal>
    </>
  )
}

export default Share
