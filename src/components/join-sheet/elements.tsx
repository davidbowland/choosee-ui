import { Drawer } from '@heroui/react'
import { ArrowRight, KeyRound } from 'lucide-react'
import React from 'react'

import { PillArrowButton } from '@components/pill-arrow-button'

const microLabel = 'text-[9px] font-bold uppercase tracking-[0.18em] text-default-600'

/**
 * The way in, for someone who was invited.
 *
 * A question rather than a label, because this is the one affordance in the app whose audience does
 * not know the feature exists — it has to describe the reader's situation, not the app's function.
 * The repo already licenses elliptical questions ("Back again?", "Anyone else coming?").
 *
 * Ships unconditionally in the prerendered markup: no storage gate, no CSS toggle, no `data-resume`.
 * That is what keeps it out of the home page's pre-paint layout contract entirely.
 */
export const JoinTrigger = ({ onPress }: { onPress: () => void }): React.ReactNode => (
  <button
    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-left transition-colors hover:border-white/[0.12] hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
    onClick={onPress}
    type="button"
  >
    <span className="flex items-center gap-2.5">
      <KeyRound aria-hidden="true" className="h-4 w-4 text-[#F59E0B]" strokeWidth={2.5} />
      <span className="text-sm text-default-800">Someone invite you?</span>
    </span>
    <span className="flex items-center gap-1 text-[13px] font-bold text-[#F59E0B]">
      Join
      <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.5} />
    </span>
  </button>
)

/**
 * The affordance on a screen that already failed — the session error state and the 404.
 *
 * No ref plumbing for focus restore: react-aria-components returns focus to whatever was focused when
 * the overlay opened, and that is this button by construction. AC-030's restore obligation is met by
 * the library rather than by hand, which is most of why an overlay was cheaper than a route.
 */
export const JoinRecoveryButton = ({ label, onPress }: { label: string; onPress: () => void }): React.ReactNode => (
  <div className="w-full max-w-xs">
    <PillArrowButton label={label} onPress={onPress} />
  </div>
)

export interface JoinFieldProps {
  describedBy: string
  inputRef: React.RefObject<HTMLInputElement | null>
  isInvalid: boolean
  onChange: (value: string) => void
  value: string
}

export const JoinField = ({ describedBy, inputRef, isInvalid, onChange, value }: JoinFieldProps): React.ReactNode => (
  <div className="flex w-full flex-col gap-1.5">
    <label className={microLabel} htmlFor="join-code">
      Code or link
    </label>
    <input
      aria-describedby={describedBy}
      aria-invalid={isInvalid || undefined}
      autoCapitalize="none"
      autoComplete="off"
      autoCorrect="off"
      className="w-full rounded-xl border border-white/[0.12] bg-white/[0.03] px-3.5 py-3 text-base text-foreground placeholder:text-default-400 focus:border-[#F59E0B] focus:outline-none"
      id="join-code"
      name="join-code"
      onChange={(event) => onChange(event.target.value)}
      placeholder="lazy giraffe"
      ref={inputRef}
      spellCheck={false}
      type="text"
      value={value}
    />
  </div>
)

export const JoinHint = ({ id, text }: { id: string; text: string }): React.ReactNode => (
  <p aria-live="polite" className="text-xs leading-relaxed text-default-500" id={id} role="status">
    {text}
  </p>
)

export const JoinError = ({ id, message, note }: { id: string; message: string; note?: string }): React.ReactNode => (
  <div className="flex flex-col gap-0.5" id={id} role="alert">
    <p className="text-sm text-red-400">{message}</p>
    {note && <p className="text-xs text-default-500">{note}</p>}
  </div>
)

/**
 * Already in this one.
 *
 * Reuses the resume list's own verb, because it is the same act. `Same name, same votes.` sits above
 * the button, where it answers the question someone has before pressing it rather than after.
 */
export const AlreadyJoined = ({
  code,
  isLoading,
  onDifferent,
  onResume,
}: {
  code: string
  isLoading: boolean
  onDifferent: () => void
  onResume: () => void
}): React.ReactNode => (
  <div className="flex flex-col gap-3">
    <div className="flex flex-col gap-1 rounded-2xl border border-[rgba(245,158,11,0.18)] bg-[rgba(245,158,11,0.06)] px-4 py-3">
      <p className="text-sm font-medium text-default-900" role="status">
        You&apos;re already in this one.
      </p>
      <p className="choosee-brand text-xl text-[#F59E0B]">{code}</p>
    </div>
    <p className="text-xs text-default-500">Same name, same votes.</p>
    <PillArrowButton isLoading={isLoading} label="Pick back up" loadingLabel="Opening…" onPress={onResume} />
    {/* Without this the state is a one-way door: mistype into a Choosee you are already in and the
        field is gone, with nothing to do but close the sheet and start again. */}
    <button
      className="self-center rounded-full px-3 py-1.5 text-xs text-default-500 underline underline-offset-4 hover:text-default-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
      onClick={onDifferent}
      type="button"
    >
      Try a different code
    </button>
  </div>
)

export const JoinSuccess = ({ code }: { code: string }): React.ReactNode => (
  <div aria-live="polite" className="flex flex-col items-center gap-2 py-4" role="status">
    <p className="choosee-brand text-3xl text-[#F59E0B]">{code}</p>
    <p className="text-sm text-default-600">Found it — taking you there…</p>
  </div>
)

export const JoinSheetShell = ({
  children,
  isOpen,
  onClose,
}: {
  children: React.ReactNode
  isOpen: boolean
  onClose: () => void
}): React.ReactNode => (
  <Drawer.Backdrop isOpen={isOpen} onOpenChange={(open: boolean) => !open && onClose()} variant="blur">
    <Drawer.Content placement="bottom">
      <Drawer.Dialog>
        <Drawer.CloseTrigger />
        <Drawer.Header>
          <span className="arena-eyebrow mb-2">Already invited</span>
          <Drawer.Heading className="choosee-brand pr-8 text-2xl text-[#F59E0B]">Join a Choosee</Drawer.Heading>
        </Drawer.Header>
        <Drawer.Body>
          <div className="flex flex-col gap-4 pb-6">{children}</div>
        </Drawer.Body>
      </Drawer.Dialog>
    </Drawer.Content>
  </Drawer.Backdrop>
)

export const JoinSubmit = ({ isLoading, label }: { isLoading: boolean; label: string }): React.ReactNode => (
  <PillArrowButton
    isLoading={isLoading}
    label={label}
    loadingLabel="Looking…"
    onPress={() => undefined}
    type="submit"
  />
)
