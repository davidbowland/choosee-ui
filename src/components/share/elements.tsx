import { Modal } from '@heroui/react'
import { Check, Copy, QrCode as QrCodeIcon, Share2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import React from 'react'

const iconButtonClass =
  'flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/[0.09] hover:text-[#E5E7EB] focus:outline-none'

// Chrome matches the SegmentedActions pill on the voting and waiting screens, so a standalone
// share pill and a segmented one read as the same object.
export const ShareGroup = ({ children }: { children: React.ReactNode }): React.ReactNode => (
  <div className="inline-flex items-center gap-1 rounded-full border border-white/[0.12] bg-white/[0.06] p-1 text-[#9CA3AF]">
    {children}
  </div>
)

export const ShareBareGroup = ({ children }: { children: React.ReactNode }): React.ReactNode => (
  <div className="inline-flex items-center gap-1 text-[#9CA3AF]">{children}</div>
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
  <button aria-label="Show QR code" className={iconButtonClass} onClick={onPress} title="Show QR code" type="button">
    <QrCodeIcon className="h-4 w-4" />
  </button>
)

export const QrModal = ({
  isOpen,
  onClose,
  url,
}: {
  isOpen: boolean
  onClose: () => void
  url: string
}): React.ReactNode => (
  <Modal isOpen={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
    <Modal.Backdrop variant="blur">
      <Modal.Container size="sm">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>Scan to join</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <div className="flex flex-col items-center gap-3 p-0.5">
              <div className="flex justify-center rounded-xl bg-white p-4">
                <QRCodeSVG size={180} value={url} />
              </div>
              <p className="break-all text-center text-xs text-[#6B7280]">{url}</p>
            </div>
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  </Modal>
)
