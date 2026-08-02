import { AlertDialog, Button, Modal, ProgressBar, Spinner } from '@heroui/react'
import { BellOff, BellRing, Check, Eye } from 'lucide-react'
import React from 'react'

export const WaitingContainer = ({ children }: { children: React.ReactNode }): React.ReactNode => (
  <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5 p-4">{children}</div>
)

export const ProgressText = ({
  finished,
  subtitle,
  total,
}: {
  finished: number
  subtitle: string
  total: number
}): React.ReactNode => (
  <div className="w-full">
    <ProgressBar color="warning" maxValue={total || 1} minValue={0} value={finished}>
      <div className="mb-2 flex items-center justify-between text-sm">
        <ProgressBar.Output>
          <span className="font-medium text-[#D4D4D4]">Voted</span>
        </ProgressBar.Output>
        <span className="tabular-nums text-[#6B7280]">
          {finished} / {total}
        </span>
      </div>
      <ProgressBar.Track>
        <ProgressBar.Fill />
      </ProgressBar.Track>
    </ProgressBar>
    <p className="mt-2 text-center text-xs text-[#4B5563]">{subtitle}</p>
  </div>
)

export const NotifySection = ({ children }: { children: React.ReactNode }): React.ReactNode => (
  <div className="w-full rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-4">
    <div className="flex flex-col gap-3">{children}</div>
  </div>
)

export const ForceRoundButton = ({
  isLoading,
  onPress,
}: {
  isLoading: boolean
  onPress: () => void
}): React.ReactNode => (
  <button
    className="inline-flex items-center gap-1.5 text-[13px] text-[#6B7280] underline decoration-white/15 underline-offset-4 transition-colors hover:text-[#9CA3AF] focus:outline-none disabled:opacity-50"
    disabled={isLoading}
    onClick={onPress}
    type="button"
  >
    {isLoading && <Spinner color="current" size="sm" />}
    Skip ahead without them
  </button>
)

export const ConfirmDialog = ({
  isLoading,
  onCancel,
  onConfirm,
  open,
}: {
  isLoading: boolean
  onCancel: () => void
  onConfirm: () => void
  open: boolean
}): React.ReactNode => (
  <AlertDialog isOpen={open} onOpenChange={(isOpen: boolean) => !isOpen && onCancel()}>
    {/* Container must nest inside Backdrop: the backdrop is the fixed, full-screen positioned
        layer, so a sibling container renders in its own unpositioned portal — invisible behind
        the blur. AlertDialog defaults to blocking Escape; dismissing this prompt does nothing
        destructive, so allow it. */}
    <AlertDialog.Backdrop isKeyboardDismissDisabled={false} variant="blur">
      <AlertDialog.Container size="sm">
        <AlertDialog.Dialog>
          <AlertDialog.Header>
            {/* Echoes the link that opened this, and stays true on the last round,
                where skipping ahead produces a winner rather than another round. */}
            <AlertDialog.Heading>Skip ahead without them?</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>
            <p className="text-sm text-[#6B7280]">
              Not everyone has voted. Their votes won&apos;t count in this round.
            </p>
          </AlertDialog.Body>
          <AlertDialog.Footer className="flex justify-end gap-2">
            <Button
              className="rounded-full border-white/[0.09] bg-white/[0.05] text-[#6B7280] hover:bg-white/[0.09]"
              isDisabled={isLoading}
              onPress={onCancel}
              slot="close"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="rounded-full bg-gradient-to-r from-[#F59E0B] to-[#D97706] font-bold text-[#0A0A0B]"
              isDisabled={isLoading}
              onPress={onConfirm}
              variant="primary"
            >
              {isLoading && <Spinner color="current" size="sm" />}
              Skip ahead
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  </AlertDialog>
)

// The switch survives the move from email to push deliberately. A pill was rejected because this
// app already uses non-interactive pill badges (FilterClosingSoonBadge, SoloVoterHint), so a pill
// does not reliably read as something you can press. A switch does.
export const NotifyCheckbox = ({
  disabled,
  isFinal,
  isSaving,
  onChange,
  reminderEvent,
  subscribed,
}: {
  disabled: boolean
  isFinal: boolean
  isSaving?: boolean
  onChange: () => void
  reminderEvent: string
  subscribed: boolean
}): React.ReactNode => (
  <button
    aria-checked={subscribed}
    aria-live="polite"
    className={`flex w-full items-center gap-3 rounded-lg text-left ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
    disabled={disabled}
    onClick={onChange}
    role="switch"
    type="button"
  >
    <div
      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
        subscribed ? 'bg-success/15 text-success' : 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B]'
      }`}
    >
      {isSaving ? (
        <Spinner color="current" size="sm" />
      ) : subscribed ? (
        <Check className="h-5 w-5" />
      ) : (
        <BellRing className="h-5 w-5" />
      )}
    </div>
    <div className="min-w-0 flex-1">
      <p className={`text-sm font-medium ${subscribed ? 'text-success' : 'text-[#D4D4D4]'}`}>
        {subscribed ? "We'll notify you!" : `Notify me when ${reminderEvent}`}
      </p>
      {/* "One notification" was true under the old per-round opt-in, where you re-armed the toggle
          every round. The opt-in is now once per Choosee and covers every remaining round plus the
          winner, so promising one was a straightforward lie to anyone who subscribed in round 1 of
          four. The copy has to describe the model that shipped. `isFinal` is the exception: there
          really is only one left to send. */}
      <p className="text-xs text-[#4B5563]">
        {isSaving
          ? 'Turning on notifications…'
          : isFinal
            ? 'One notification when the winner is in.'
            : subscribed
              ? 'Each round, and the winner. Nothing else.'
              : 'Each round until a winner, and nothing else.'}
      </p>
    </div>
    <div
      className={`relative h-6 w-11 flex-shrink-0 rounded-full border transition-colors duration-200 ${
        subscribed ? 'border-[#F59E0B] bg-[#F59E0B]' : 'border-white/[0.15] bg-white/[0.05]'
      }`}
    >
      <div
        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          subscribed ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </div>
  </button>
)

// `denied` and `unsupported` are dead ends from inside the app — only the OS or a different browser
// can resolve either — so this deliberately renders no control. A switch that silently does nothing
// is worse than a sentence explaining why there is nothing to press.
export const NotifyBlocked = ({ body, title }: { body: string; title: string }): React.ReactNode => (
  <div className="flex items-start gap-3 text-left">
    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-[#6B7280]">
      <BellOff className="h-5 w-5" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-[#D4D4D4]">{title}</p>
      <p className="text-xs text-[#4B5563]">{body}</p>
    </div>
  </div>
)

export const TurnOffLink = ({ onPress }: { onPress: () => void }): React.ReactNode => (
  <button
    className="text-center text-xs text-[#6B7280] underline decoration-white/15 underline-offset-4 transition-colors hover:text-[#9CA3AF] focus:outline-none"
    onClick={onPress}
    type="button"
  >
    Turn off
  </button>
)

// The verb has to match what the user pressed. A failed "Turn off" reporting "Couldn't turn ON
// notifications" tells them the opposite of what happened, and the switch beside it still reads
// subscribed — so the sentence and the control disagree about which direction failed.
export const NotifyRetryMessage = ({ action }: { action: 'on' | 'off' }): React.ReactNode => (
  <p className="text-center text-xs text-[#4B5563]">
    Couldn&apos;t turn {action === 'on' ? 'on' : 'off'} notifications. Please try again.
  </p>
)

// Shown only after the user asks for notifications, never on load. The three gestures happen in
// Safari's own chrome rather than anywhere this app can reach, so "stop and do this now" is the
// only honest framing — hence a modal rather than an inline hint.
export const IosNotifySheet = ({ onClose, open }: { onClose: () => void; open: boolean }): React.ReactNode => (
  <Modal isOpen={open} onOpenChange={(isOpen: boolean) => !isOpen && onClose()}>
    {/* Container nests inside Backdrop for the same reason ConfirmDialog does: the backdrop is the
        fixed, full-screen positioned layer, and a sibling container renders into its own
        unpositioned portal, invisible behind the blur. */}
    <Modal.Backdrop variant="blur">
      <Modal.Container size="sm">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>iPhone needs one more step</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <div className="flex flex-col gap-3">
              <p className="text-sm text-[#6B7280]">Safari only sends notifications from an app on your Home Screen.</p>
              <ol className="flex flex-col gap-2 text-sm text-[#D4D4D4]">
                <li>1. Tap Share</li>
                <li>2. Tap Add to Home Screen</li>
                <li>3. Open Choosee from there</li>
              </ol>
            </div>
          </Modal.Body>
          <Modal.Footer className="flex justify-end">
            <Button
              className="rounded-full border-white/[0.09] bg-white/[0.05] text-[#6B7280] hover:bg-white/[0.09]"
              onPress={onClose}
              slot="close"
              variant="outline"
            >
              Not now
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  </Modal>
)

export const ActionRow = ({ children }: { children: React.ReactNode }): React.ReactNode => (
  <div className="flex flex-col items-center gap-3">{children}</div>
)

export const SegmentedActions = ({ children }: { children: React.ReactNode }): React.ReactNode => (
  <div className="inline-flex items-center rounded-full border border-white/[0.12] bg-white/[0.06] p-1">{children}</div>
)

export const SegmentDivider = (): React.ReactNode => <div className="mx-1 h-5 w-px bg-white/[0.08]" />

export const BracketButton = ({ onPress }: { onPress: () => void }): React.ReactNode => (
  <button
    className="flex h-8 items-center gap-2 rounded-full px-3.5 text-sm font-medium text-[#E5E7EB] transition-colors hover:bg-white/[0.08] focus:outline-none"
    onClick={onPress}
    type="button"
  >
    <Eye className="h-4 w-4" />
    View bracket
  </button>
)
