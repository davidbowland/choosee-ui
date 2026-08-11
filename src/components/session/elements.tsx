import { AlertDescription, AlertRoot } from '@heroui/react'
import { AlertTriangle, Clock, RotateCw, Users } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

/**
 * A failure that reads as one.
 *
 * `AlertRoot status="danger"` painted nothing here: HeroUI recolours `.alert__indicator` and
 * `.alert__title`, and this rendered neither, so what shipped was a neutral surface card with muted
 * text. The icon and the border are what make the status visible; role="alert" is what makes it
 * audible, which it also never was.
 *
 * `children` carries the exits. A message that names a recovery and offers no control for it is
 * where users get stuck, so the callers pass the controls in rather than this guessing.
 */
export const ErrorBanner = ({
  children,
  message,
}: {
  children?: React.ReactNode
  message: string
}): React.ReactNode => (
  <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-6">
    <AlertRoot className="border border-[rgba(248,113,113,0.28)] bg-[rgba(248,113,113,0.08)]" status="danger">
      <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0 text-red-400" strokeWidth={2.5} />
      <AlertDescription role="alert">{message}</AlertDescription>
    </AlertRoot>
    {children}
    <Link className="text-[#F59E0B] underline" href="/">
      Go home
    </Link>
  </div>
)

/** The retry the network-failure copy has always promised and never offered. */
export const RetryLoadButton = ({ onPress }: { onPress: () => void }): React.ReactNode => (
  <button
    className="flex items-center gap-2 rounded-full border border-white/[0.12] px-4 py-2 text-sm font-medium text-default-800 transition-colors hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
    onClick={onPress}
    type="button"
  >
    <RotateCw aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.5} />
    Try again
  </button>
)

export const StartAnotherLink = (): React.ReactNode => (
  <Link className="text-sm text-default-600 underline underline-offset-4 hover:text-default-900" href="/">
    Start another Choosee
  </Link>
)

export const ClosingSoonErrorAlert = (): React.ReactNode => (
  <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-6">
    <AlertRoot status="warning">
      <AlertDescription>
        <div className="flex items-start gap-2">
          <Clock className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-medium">Not enough restaurants are open near you</p>
            <p className="mt-1 text-sm opacity-80">
              Turn off the &ldquo;closing soon&rdquo; filter, or expand your search area.
            </p>
          </div>
        </div>
      </AlertDescription>
    </AlertRoot>
    <Link className="text-[#F59E0B] underline" href="/">
      Try again
    </Link>
  </div>
)

export const SoloVoterHint = (): React.ReactNode => (
  <div className="flex items-center gap-2 rounded-lg border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.07)] px-3 py-2 text-xs text-[#F59E0B]">
    <Users className="h-4 w-4 flex-shrink-0" />
    <span>You&apos;re the only one here. Invite friends to vote with you.</span>
  </div>
)

export const FilterClosingSoonBadge = (): React.ReactNode => (
  <div className="flex items-center gap-1.5 rounded-full border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.07)] px-2.5 py-1 text-xs text-[#F59E0B]">
    <Clock className="h-3 w-3" />
    <span>Closing soon hidden</span>
  </div>
)
