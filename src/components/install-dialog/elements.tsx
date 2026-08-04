import { Button, Modal } from '@heroui/react'
import React from 'react'

// Same shell as QrModal in `share/elements.tsx` — blurred backdrop, small container, close trigger
// in the corner — so the two dialogs read as the same object wearing different contents.
export const InstallModal = ({
  children,
  onClose,
  open,
}: {
  children: React.ReactNode
  onClose: () => void
  open: boolean
}): React.ReactNode => (
  <Modal isOpen={open} onOpenChange={(isOpen: boolean) => !isOpen && onClose()}>
    <Modal.Backdrop variant="blur">
      <Modal.Container size="sm">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading className="pr-8 text-lg text-[#E5E7EB]">Put Choosee on your Home Screen</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <div className="flex flex-col gap-4 p-0.5">{children}</div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              className="w-full rounded-full text-[#6B7280] hover:bg-white/[0.06]"
              onPress={onClose}
              variant="ghost"
            >
              Not now
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  </Modal>
)

// `exclusive` is the iOS-only second line. It is the strongest thing we can say and it is only true
// on iPhone: Chrome, Firefox for Android and desktop Safari all deliver push to an ordinary tab.
export const InstallOffer = ({ exclusive }: { exclusive: boolean }): React.ReactNode => (
  <div className="flex flex-col gap-1.5">
    <p className="text-sm text-[#9CA3AF]">Opens like an app, straight to a full screen.</p>
    {exclusive && <p className="text-sm text-[#F59E0B]">It&apos;s the only way to get notified when a round opens.</p>}
  </div>
)

export const InstallSteps = ({ steps }: { steps: string[] }): React.ReactNode => (
  <ol className="flex flex-col gap-2.5">
    {steps.map((step, index) => (
      <li className="flex items-start gap-2.5 text-sm text-[#D4D4D4]" key={step}>
        <span
          aria-hidden="true"
          className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#F59E0B]/20 bg-[#F59E0B]/[0.12] text-[11px] font-bold text-[#F59E0B]"
        >
          {index + 1}
        </span>
        <span>{step}</span>
      </li>
    ))}
  </ol>
)

export const InstallButton = ({ onPress }: { onPress: () => void }): React.ReactNode => (
  <Button
    className="w-full rounded-full bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-[13px] font-bold text-[#0A0A0B] hover:opacity-90"
    onPress={onPress}
    variant="primary"
  >
    Add to Home Screen
  </Button>
)
