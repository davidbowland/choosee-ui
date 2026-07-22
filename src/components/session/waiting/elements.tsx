import { AlertDialog, Button, FieldError, Input, ProgressBar, Spinner, TextField } from '@heroui/react'
import { BellRing, Check, Eye } from 'lucide-react'
import React from 'react'

import { GoogleLogo } from '@components/google-logo'

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
    <AlertDialog.Backdrop variant="blur" />
    <AlertDialog.Container size="sm">
      <AlertDialog.Dialog>
        <AlertDialog.Header>
          <AlertDialog.Heading>Skip to next round?</AlertDialog.Heading>
        </AlertDialog.Header>
        <AlertDialog.Body>
          <p className="text-sm text-[#6B7280]">Not everyone has voted yet. We&apos;ll skip their picks and move on.</p>
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
            Confirm
          </Button>
        </AlertDialog.Footer>
      </AlertDialog.Dialog>
    </AlertDialog.Container>
  </AlertDialog>
)

export const NotifyCheckbox = ({
  checked,
  disabled,
  onChange,
  subscribed,
}: {
  checked: boolean
  disabled: boolean
  onChange: () => void
  subscribed: boolean
}): React.ReactNode => (
  <button
    className={`flex w-full items-center gap-3 rounded-lg text-left ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
    disabled={disabled}
    onClick={onChange}
    type="button"
  >
    <div
      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
        subscribed ? 'bg-success/15 text-success' : 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B]'
      }`}
    >
      {subscribed ? <Check className="h-5 w-5" /> : <BellRing className="h-5 w-5" />}
    </div>
    <div className="min-w-0 flex-1">
      <p className={`text-sm font-medium ${subscribed ? 'text-success' : 'text-[#D4D4D4]'}`}>
        {subscribed ? "We'll text you!" : 'Text me when voting opens'}
      </p>
      <p className="text-xs text-[#4B5563]">
        {subscribed ? "We'll send you a text when voting opens" : 'Tap to get a text reminder'}
      </p>
    </div>
    <div
      className={`relative h-6 w-11 flex-shrink-0 rounded-full border transition-colors duration-200 ${
        checked || subscribed ? 'border-[#F59E0B] bg-[#F59E0B]' : 'border-white/[0.15] bg-white/[0.05]'
      }`}
    >
      <div
        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked || subscribed ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </div>
  </button>
)

export const PhoneInput = ({
  error,
  isLoading,
  isValid,
  onChange,
  onSubmit,
  value,
}: {
  error?: string
  isLoading: boolean
  isValid?: boolean
  onChange: (v: string) => void
  onSubmit: () => void
  value: string
}): React.ReactNode => (
  <div className="flex w-full gap-2">
    <TextField className="flex-1" isInvalid={!!error}>
      <Input onChange={(e) => onChange(e.target.value)} placeholder="+1 (555) 123-4567" type="tel" value={value} />
      {error && <FieldError>{error}</FieldError>}
    </TextField>
    <Button
      className="rounded-full bg-gradient-to-r from-[#F59E0B] to-[#D97706] font-bold text-[#0A0A0B]"
      isDisabled={!isValid || isLoading}
      onPress={onSubmit}
      variant="primary"
    >
      {isLoading && <Spinner color="current" size="sm" />}
      Register
    </Button>
  </div>
)

export const ConsentCheckbox = ({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
}): React.ReactNode => (
  <button
    aria-checked={checked}
    aria-labelledby="consent-text"
    className="flex w-full items-start gap-3 text-left"
    onClick={() => onChange(!checked)}
    role="checkbox"
    type="button"
  >
    <div
      className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-colors ${
        checked ? 'border-[#F59E0B] bg-[#F59E0B] text-[#0A0A0B]' : 'border-white/[0.2] bg-white/[0.05]'
      }`}
    >
      {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
    </div>
    <span className="text-xs leading-relaxed text-[#9CA3AF]" id="consent-text">
      I agree to let Choosee text me about rounds in this and other Choosee polls I join. My number stays private —
      it&apos;s never sold, shared, or used for marketing. I can stop anytime by replying STOP or turning off reminders.
      Message and data rates may apply.
    </span>
  </button>
)

export const VerificationHint = ({ last4 }: { last4: string | null }): React.ReactNode => (
  <p className="text-xs leading-relaxed text-[#9CA3AF]">
    You&apos;re subscribed. The first text includes a one-tap verification link — open it to keep reminders coming to{' '}
    ●●●●{last4 ?? ''}.
  </p>
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

export const NotifyAuthGate = ({ onSignIn }: { onSignIn: () => void }): React.ReactNode => (
  <div className="flex flex-col items-center gap-2">
    <p className="text-center text-sm text-[#6B7280]">Sign in with Google for text reminders</p>
    <Button
      className="rounded-full border-white/[0.09] bg-white/[0.05] text-[#D4D4D4]"
      onPress={onSignIn}
      size="sm"
      variant="outline"
    >
      <GoogleLogo />
      Sign in with Google
    </Button>
  </div>
)
