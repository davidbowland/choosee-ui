import { toast } from '@heroui/react'
import React, { useEffect, useState } from 'react'

import { CopyButton, QrButton, QrModal, ShareBareGroup, ShareButton, ShareGroup } from './elements'

export interface ShareProps {
  sessionId: string
  variant?: 'group' | 'bare'
}

const SHARE_TITLE = 'Choosee'
const COPIED_RESET_MS = 2000

/** Hyphenated in storage and in the URL, spoken and read as words. */
const displayCode = (sessionId: string): string => sessionId.replace(/-/g, ' ')

// navigator.share sends `text` and `url` as separate fields, so this sentence never contains the
// link. That is why the code is introduced by the condition it matters under rather than offered as
// an alternative to the request -- "help me pick, or enter this code" contrasts two things that
// aren't alternatives, against an antecedent the recipient cannot see.
const shareText = (sessionId: string): string =>
  `Help me pick a place to eat. If the link won't open, enter the code "${displayCode(sessionId)}" in Choosee.`

const Share = ({ sessionId, variant = 'group' }: ShareProps): React.ReactNode => {
  const [copied, setCopied] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
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

  useEffect(() => {
    if (!codeCopied) return undefined
    const timer = setTimeout(() => setCodeCopied(false), COPIED_RESET_MS)
    return () => clearTimeout(timer)
  }, [codeCopied])

  const sessionUrl = `${typeof window === 'undefined' ? '' : window.location.origin}/s/${sessionId}`

  const handleShare = async (): Promise<void> => {
    try {
      await navigator.share({ title: SHARE_TITLE, text: shareText(sessionId), url: sessionUrl })
    } catch {
      // User canceled or the share failed; copy and QR remain available.
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

  // Copies the words, not the URL. Someone who wanted the URL has a button for that one row up.
  const handleCopyCode = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(displayCode(sessionId))
      setCodeCopied(true)
    } catch {
      toast.danger("Couldn't copy the code. Read it out instead.")
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
      <QrModal
        code={displayCode(sessionId)}
        codeCopied={codeCopied}
        isOpen={qrOpen}
        onClose={() => setQrOpen(false)}
        onCopyCode={handleCopyCode}
        url={sessionUrl}
      />
    </>
  )
}

export default Share
