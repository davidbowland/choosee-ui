import { CheckSquare, Clock, Trophy, X } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { CardState, TimeNote } from './helpers'

export const ListHeading = (): React.ReactNode => <h2 className="arena-eyebrow">Pick back up</h2>

const Glyph = ({ state }: { state: CardState }): React.ReactNode => {
  const className = 'h-4 w-4'
  if (state.kind === 'winner') return <Trophy aria-hidden="true" className={className} strokeWidth={2.2} />
  if (state.kind === 'your-turn') return <CheckSquare aria-hidden="true" className={className} strokeWidth={2.2} />
  return <Clock aria-hidden="true" className={className} strokeWidth={2.2} />
}

/**
 * What the card wants from you, which is the only question a returning visitor arrives with. It
 * leads because the alternative — leading with the address — leads with the one field two Choosees
 * started from the same kitchen have in common.
 */
const headline = (state: CardState): string => {
  switch (state.kind) {
    case 'winner':
      return state.winnerName ? `${state.winnerName} won` : 'Winner picked'
    case 'your-turn':
      return 'Your turn to vote'
    case 'waiting':
      if (state.waitingOn) return `Waiting on ${state.waitingOn}`
      // A count of zero means the voter list and the session disagree for the moment — every vote is
      // in but the round has not turned over yet. "Waiting on 0 others" is not a sentence.
      if (state.remaining < 1) return 'Waiting on the others'
      return `Waiting on ${state.remaining} other${state.remaining === 1 ? '' : 's'}`
    default:
      // Nothing has arrived yet, so the round — which is local — is the most this can honestly say.
      return `Round ${state.round} of ${state.totalRounds}`
  }
}

const Headline = ({ state }: { state: CardState }): React.ReactNode => {
  if (state.kind !== 'your-turn') {
    return <span className="truncate text-sm font-semibold text-[#F5F5F5]">{headline(state)}</span>
  }

  return (
    <span className="flex items-center gap-1.5 truncate text-sm font-semibold text-[#F59E0B]">
      {/* The one animated element on the card, on the one state that is asking for something.
          motion-safe leaves it still for anyone who has asked the OS for reduced motion. */}
      <span aria-hidden="true" className="h-1.5 w-1.5 flex-none rounded-full bg-[#F59E0B] motion-safe:animate-pulse" />
      {headline(state)}
    </span>
  )
}

/**
 * Who is in it, and how far along it is. The roster is what actually tells two Choosees apart, and
 * the round is what says whether it is worth going back to.
 */
const IdentityLine = ({ roster, state }: { roster?: string; state: CardState }): React.ReactNode => {
  const className = 'truncate text-xs tabular-nums text-[#9CA3AF]'

  // A finished Choosee has no round left to report, so the roster is the whole line — or there is no
  // line, rather than an empty one holding space open.
  if (state.kind === 'winner') {
    return roster ? <span className={className}>{roster}</span> : null
  }

  // The round has already been said once, up top. Repeating it here would spend the line on nothing,
  // so this waits for the roster — and shows the shimmer only while there is genuinely nothing to say.
  if (state.kind === 'loading') {
    return roster ? (
      <span className={className}>{roster}</span>
    ) : (
      <span className="flex items-center text-xs">
        <span className="h-2.5 w-16 rounded bg-white/10 motion-safe:animate-pulse" />
      </span>
    )
  }

  const round = `${state.round} of ${state.totalRounds}`
  return <span className={className}>{roster ? `${roster} · round ${round}` : `Round ${round}`}</span>
}

/**
 * Time first, address last, and both quiet. Whatever runs off the end of this line at 320px is the
 * least useful thing on the card, which is the entire reason the address is on it.
 */
const MetaLine = ({ address, time }: { address: string; time: TimeNote }): React.ReactNode => (
  <span className={`truncate text-[11px] tabular-nums ${time.isExpiring ? 'text-[#F59E0B]' : 'text-[#6B7280]'}`}>
    {time.text} · {address}
  </span>
)

export interface ResumeCardProps {
  address: string
  roster?: string
  sessionId: string
  state: CardState
  time: TimeNote
  onDismiss: () => void
}

export const ResumeCard = ({
  address,
  onDismiss,
  roster,
  sessionId,
  state,
  time,
}: ResumeCardProps): React.ReactNode => {
  // The urgent state borrows the amber fill/stroke ratio .arena-eyebrow already establishes, rather
  // than introducing a new device for it.
  const isUrgent = state.kind === 'your-turn'

  return (
    <div
      className={`rounded-[18px] border p-[3px] ${
        // The amber ratio is .arena-eyebrow's, 0.08 fill against a 0.18 stroke, so the urgent state
        // is built from vocabulary the stylesheet already speaks.
        isUrgent ? 'border-[#F59E0B]/[0.18] bg-[#F59E0B]/[0.08]' : 'border-white/[0.06] bg-white/[0.025]'
      }`}
    >
      {/* Same construction as .arena-glass-inner, at a smaller radius — including the inset top
          highlight. Without it these read flatter than the CreateCard they sit directly above. */}
      <div
        className={`flex items-stretch overflow-hidden rounded-[15px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${
          isUrgent ? 'bg-[rgba(20,15,6,0.97)]' : 'bg-[rgba(12,12,13,0.97)]'
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
            <Headline state={state} />
            <IdentityLine roster={roster} state={state} />
            <MetaLine address={address} time={time} />
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
