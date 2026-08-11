import { Modal } from '@heroui/react'
import { Check, Copy, QrCode as QrCodeIcon, Share2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import React from 'react'

const iconButtonClass =
  'flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/[0.09] hover:text-default-900 focus:outline-none'

// Chrome matches the SegmentedActions pill on the voting and waiting screens, so a standalone
// share pill and a segmented one read as the same object.
export const ShareGroup = ({ children }: { children: React.ReactNode }): React.ReactNode => (
  <div className="inline-flex items-center gap-1 rounded-full border border-white/[0.12] bg-white/[0.06] p-1 text-default-700">
    {children}
  </div>
)

export const ShareBareGroup = ({ children }: { children: React.ReactNode }): React.ReactNode => (
  <div className="inline-flex items-center gap-1 text-default-700">{children}</div>
)

export const ShareButton = ({ onPress }: { onPress: () => void }): React.ReactNode => (
  <button aria-label="Share" className={iconButtonClass} onClick={onPress} title="Share" type="button">
    <Share2 className="h-4 w-4" />
  </button>
)

export const CopyButton = ({ copied, onPress }: { copied: boolean; onPress: () => void }): React.ReactNode => (
  <button
    aria-label={copied ? 'Link copied' : 'Copy link'}
    className={iconButtonClass}
    onClick={onPress}
    title={copied ? 'Link copied' : 'Copy link'}
    type="button"
  >
    {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
  </button>
)

export const QrButton = ({ onPress }: { onPress: () => void }): React.ReactNode => (
  // "Show code and QR", not "Show QR code": the dialog now holds something that cannot be scanned,
  // and this label is how someone decides whether opening it is worth their time.
  <button
    aria-label="Show code and QR"
    className={iconButtonClass}
    onClick={onPress}
    title="Show code and QR"
    type="button"
  >
    <QrCodeIcon className="h-4 w-4" />
  </button>
)

export const CopyCodeButton = ({ copied, onPress }: { copied: boolean; onPress: () => void }): React.ReactNode => (
  <button
    aria-label={copied ? 'Code copied' : 'Copy code'}
    className="flex items-center gap-1.5 rounded-full border border-white/[0.12] px-3 py-1.5 text-[11px] font-semibold text-default-700 transition-colors hover:bg-white/[0.06] hover:text-default-900 focus:outline-none"
    onClick={onPress}
    title={copied ? 'Code copied' : 'Copy code'}
    type="button"
  >
    {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
    {copied ? 'Copied' : 'Copy'}
  </button>
)

export const QrModal = ({
  code,
  codeCopied,
  isOpen,
  onClose,
  onCopyCode,
  url,
}: {
  code: string
  codeCopied: boolean
  isOpen: boolean
  onClose: () => void
  onCopyCode: () => void
  url: string
}): React.ReactNode => (
  <Modal isOpen={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
    <Modal.Backdrop variant="blur">
      <Modal.Container size="sm">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            {/* This is the dialog's accessible name. "Scan to join" would send a screen-reader user
                away before reaching the half of this dialog they can actually use. */}
            <Modal.Heading>Two ways in</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <div className="flex flex-col items-center gap-3 p-0.5">
              <div className="flex justify-center rounded-xl bg-white p-4">
                <QRCodeSVG size={180} value={url} />
              </div>
              <p className="break-all text-center text-xs text-default-600">{url}</p>
              {/* The reason this dialog exists twice over: it is already the show-my-screen surface,
                  which is exactly the moment someone says "I can't open your link, just tell me". */}
              <div className="flex w-full items-center gap-3 pt-1">
                <span className="h-px flex-1 bg-white/[0.07]" />
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-default-600">
                  Or read this out
                </span>
                <span className="h-px flex-1 bg-white/[0.07]" />
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-default-600">Choosee code</span>
                {/* Space-separated, though stored hyphenated — words read aloud as words. The field
                    accepts either, which is what keeps the two halves from drifting apart. */}
                <span className="choosee-brand text-2xl text-[#F59E0B]">{code}</span>
                <CopyCodeButton copied={codeCopied} onPress={onCopyCode} />
              </div>
              <p className="text-center text-xs text-default-600">
                They can type this into Choosee &mdash; no link needed.
              </p>
            </div>
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  </Modal>
)
