import { CheckSquare, Clock, Trophy, X } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { CardState } from './helpers'

export const ListHeading = (): React.ReactNode => <h2 className="arena-eyebrow">Pick back up</h2>

const Glyph = ({ state }: { state: CardState }): React.ReactNode => {
  const className = 'h-4 w-4'
  if (state.kind === 'winner') return <Trophy aria-hidden="true" className={className} strokeWidth={2.2} />
  if (state.kind === 'your-turn') return <CheckSquare aria-hidden="true" className={className} strokeWidth={2.2} />
  return <Clock aria-hidden="true" className={className} strokeWidth={2.2} />
}

const StatusLine = ({ state }: { state: CardState }): React.ReactNode => {
  switch (state.kind) {
    case 'winner':
      return (
        <span className="text-xs text-[#D4D4D4]">{state.winnerName ? `${state.winnerName} won` : 'Winner picked'}</span>
      )
    case 'your-turn':
      return (
        <span className="flex items-center gap-1.5 text-xs font-medium text-[#F59E0B]">
          {/* The one animated element on the card, on the one state that is asking for something.
              motion-safe leaves it still for anyone who has asked the OS for reduced motion. */}
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#F59E0B] motion-safe:animate-pulse" />
          Your turn &mdash; round {state.round} of {state.totalRounds}
        </span>
      )
    case 'waiting':
      return (
        <span className="text-xs tabular-nums text-[#9CA3AF]">
          Round {state.round} of {state.totalRounds} &mdash; {state.votersSubmitted} of {state.voterCount} voted
        </span>
      )
    default:
      // The round comes from the local record, so it is on screen before any request finishes.
      // Only the vote counts shimmer — and `motion-safe` leaves the bar still for anyone who has
      // asked the OS for reduced motion.
      return (
        <span className="flex items-center gap-2 text-xs tabular-nums text-[#9CA3AF]">
          Round {state.round} of {state.totalRounds}
          <span className="h-2.5 w-16 rounded bg-white/10 motion-safe:animate-pulse" />
        </span>
      )
  }
}

export interface ResumeCardProps {
  address: string
  sessionId: string
  state: CardState
  onDismiss: () => void
}

export const ResumeCard = ({ address, onDismiss, sessionId, state }: ResumeCardProps): React.ReactNode => {
  // The urgent state borrows the amber fill/stroke ratio .arena-eyebrow already establishes, rather
  // than introducing a new device for it.
  const isUrgent = state.kind === 'your-turn'

  return (
    <div
      className={`rounded-[18px] border p-[3px] ${
        isUrgent ? 'border-[#F59E0B]/25 bg-[#F59E0B]/[0.07]' : 'border-white/[0.06] bg-white/[0.025]'
      }`}
    >
      <div
        className={`flex items-stretch overflow-hidden rounded-[15px] ${
          isUrgent ? 'bg-[#140F06]/95' : 'bg-[#0C0C0D]/95'
        }`}
      >
        <Link className="flex flex-1 items-center gap-3 p-3 hover:bg-white/[0.02]" href={`/s/${sessionId}`}>
          <span
            className={`grid h-8 w-8 flex-none place-items-center rounded-[10px] border ${
              isUrgent
                ? 'border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B]'
                : 'border-white/[0.06] bg-white/[0.04] text-[#9CA3AF]'
            }`}
          >
            <Glyph state={state} />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-sm font-semibold text-[#F5F5F5]">{address}</span>
            <StatusLine state={state} />
          </span>
        </Link>
        {/* Divided from the tap target: dismissal is permanent, and a thumb reaching for the card
            finds this corner. */}
        <button
          aria-label={`Dismiss ${address}`}
          className="flex w-10 flex-none items-center justify-center border-l border-white/[0.07] text-[#4B5563] hover:bg-white/[0.03] hover:text-[#D4D4D4]"
          onClick={onDismiss}
          type="button"
        >
          <X aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.4} />
        </button>
      </div>
    </div>
  )
}
