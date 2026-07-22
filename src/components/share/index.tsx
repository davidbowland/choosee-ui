import { toast } from '@heroui/react'
import React, { useEffect, useState } from 'react'

import { CopyButton, QrButton, QrModal, ShareBareGroup, ShareButton, ShareGroup } from './elements'

export interface ShareProps {
  sessionId: string
  variant?: 'group' | 'bare'
}

const SHARE_TITLE = 'Choosee'
const SHARE_TEXT = 'Help me pick a place to eat'
const COPIED_RESET_MS = 2000

const Share = ({ sessionId, variant = 'group' }: ShareProps): React.ReactNode => {
  const [copied, setCopied] = useState(false)
  const [canShare, setCanShare] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
  }, [])

  useEffect(() => {
    if (!copied) return undefined
    const timer = setTimeout(() => setCopied(false), COPIED_RESET_MS)
    return () => clearTimeout(timer)
  }, [copied])

  const sessionUrl = `${typeof window === 'undefined' ? '' : window.location.origin}/s/${sessionId}`

  const handleShare = async (): Promise<void> => {
    try {
      await navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url: sessionUrl })
    } catch {
      // User cancelled or the share failed; copy and QR remain available.
    }
  }

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(sessionUrl)
      setCopied(true)
    } catch {
      toast.danger("Couldn't copy the link. Use the QR code instead.")
    }
  }

  const Group = variant === 'bare' ? ShareBareGroup : ShareGroup

  return (
    <>
      <Group>
        {canShare && <ShareButton onPress={handleShare} />}
        <CopyButton copied={copied} onPress={handleCopy} />
        <QrButton onPress={() => setQrOpen(true)} />
      </Group>
      <QrModal isOpen={qrOpen} onClose={() => setQrOpen(false)} url={sessionUrl} />
    </>
  )
}

export default Share
