import { CheckSquare, ChevronDown, Clock, Trophy, X } from 'lucide-react'
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
  // The answer wears the accent too, but not the dot. Amber means the card wants you; the pulse
  // means somebody is waiting on you, and nobody is waiting on you to read a result.
  if (state.kind === 'winner') {
    return <span className="truncate text-sm font-semibold text-[#F59E0B]">{headline(state)}</span>
  }

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
const IdentityLine = ({
  isSettled,
  roster,
  state,
}: {
  isSettled: boolean
  roster?: string
  state: CardState
}): React.ReactNode => {
  const className = 'truncate text-xs tabular-nums text-[#9CA3AF]'

  // A finished Choosee has no round left to report, so the roster is the whole line. With nobody to
  // name, the line still holds its space: the skeleton that stood here cannot know a winner has no
  // roster, and a card that comes back a line shorter than its placeholder pulls everything below it
  // up at the reveal — on mobile, the create card and its text input. A winner is rank 0, so that
  // shrink would happen at the top of the list, where it moves the most.
  //
  // The zero-width space is what makes the line box exist. An empty block generates none, so the
  // height would collapse to zero and the reservation would be worth nothing.
  if (state.kind === 'winner') {
    return roster ? (
      <span className={className}>{roster}</span>
    ) : (
      <span aria-hidden="true" className="block text-xs">
        &#8203;
      </span>
    )
  }

  // The round has already been said once, up top. Repeating it here would spend the line on nothing,
  // so this waits for the roster.
  //
  // The shimmer means "still coming", so it is shown only while something still is. A card whose
  // request failed is `loading` too — no data to derive a kind from — but nothing is on its way, and
  // a bar that pulses for as long as the page stays open promises an arrival that will never happen.
  // That one holds the line's space the same way a rosterless winner does, quietly.
  if (state.kind === 'loading') {
    if (roster) return <span className={className}>{roster}</span>
    if (isSettled)
      return (
        <span aria-hidden="true" className="block text-xs">
          &#8203;
        </span>
      )
    /* Block wrapper, inline-block bar: a flex wrapper generates no line box for text-less content,
       so this line would measure 10px against the 16px it stands in for and the card would grow
       when the roster lands. Same reason as ResumeCardSkeleton, which documents it at length. */
    return (
      <span className="block text-xs">
        <span className="inline-block h-2.5 w-16 rounded bg-white/10 motion-safe:animate-pulse" />
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

const shimmer = 'rounded bg-white/10 motion-safe:animate-pulse'

/**
 * A card whose queries have not settled yet.
 *
 * Built from ResumeCard's own wrappers and type sizes rather than from a height constant, so the two
 * measure the same by construction — a skeleton that is a few pixels short would move the create
 * form the moment the real cards arrive, which is the exact jump this exists to prevent.
 *
 * Each line wrapper is `block`, not `flex`. That is the whole trick and it is easy to undo by
 * accident: a flex container establishes a flex formatting context, where line-height does not
 * apply and a child with no text generates no line box at all. Written as flex, `text-sm` styles
 * nothing, the wrapper collapses to the bar's 10px instead of the real card's 20px, the column ends
 * up shorter than the 32px icon beside it, and the card grows by ~24px the instant it settles.
 * Block wrappers with inline-block bars keep the strut, so each line measures its own type size.
 *
 * Deliberately not a link and deliberately without a dismiss control. Nothing here is worth tapping
 * until the card behind it is final, and a tap target that changes what it points at underneath a
 * thumb already reaching for it is worse than no tap target at all.
 */
export const ResumeCardSkeleton = (): React.ReactNode => (
  <div
    aria-hidden="true"
    className="rounded-[18px] border border-white/[0.06] bg-white/[0.025] p-[3px]"
    data-loading="card"
  >
    <div className="flex items-stretch overflow-hidden rounded-[15px] bg-[rgba(12,12,13,0.97)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="flex flex-1 items-center gap-3 p-3">
        <span className={`h-8 w-8 flex-none rounded-[10px] border border-white/[0.05] bg-white/[0.04] ${shimmer}`} />
        <span className="flex min-w-0 flex-col gap-0.5">
          {/* One box per line of the real card — headline, identity, meta — each carrying that
              line's own type size, so the column adds up to the same height without repeating the
              numbers. The bars are inline-block so they sit inside the line box rather than
              replacing it. */}
          <span className="block text-sm font-semibold">
            <span className={`inline-block h-2.5 w-28 ${shimmer}`} />
          </span>
          <span className="block text-xs">
            <span className={`inline-block h-2 w-36 ${shimmer}`} />
          </span>
          <span className="block text-[11px]">
            <span className={`inline-block h-2 w-20 ${shimmer}`} />
          </span>
        </span>
      </div>
      {/* The dismiss column's width, with nothing in it. The button appears with the card, but the
          space it will take cannot appear with it. */}
      <span className="w-10 flex-none border-l border-white/[0.04]" />
    </div>
  </div>
)

export interface ShowMoreProps {
  hidden: number
  isExpanded: boolean
  onPress: () => void
}

/**
 * What the cap is hiding, and the way to see it. Without this the fourth card is simply gone, which
 * is the cap telling a lie the visitor has no way to catch.
 *
 * It reveals the whole remainder at once, and collapsing is the only way back. Someone holding six
 * live Choosees asked for six, and a second page would be a worse answer than a longer one — paging
 * a list this short would spend two taps to save one scroll.
 *
 * Dashed rather than solid: every other border in this list is a card edge, and this is not another
 * card. aria-expanded because that is exactly what this is — a disclosure for the rest of the list —
 * and the label alone changing from "Show 3 more" to "Show fewer" says it only to people reading it.
 */
export const ShowMore = ({ hidden, isExpanded, onPress }: ShowMoreProps): React.ReactNode => (
  <button
    aria-expanded={isExpanded}
    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/10 bg-white/[0.015] p-2.5 text-xs font-medium text-[#9CA3AF] transition-colors hover:border-white/20 hover:text-[#F5F5F5]"
    onClick={onPress}
    type="button"
  >
    <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 ${isExpanded ? 'rotate-180' : ''}`} strokeWidth={2.2} />
    {isExpanded ? 'Show fewer' : `Show ${hidden} more`}
  </button>
)

/**
 * The space ShowMore will take, held from the first frame so the row does not arrive with the cards.
 *
 * Built from ShowMore's own box — same padding, same border width, same text size — with the label
 * present but invisible, so the height comes out of the same declarations rather than a constant
 * that has to be kept in step. On mobile the columns stack hero → cards → form, so a row that
 * appears at reveal pushes the create card and its text input down; that is the same shift the
 * skeletons exist to prevent, one row lower.
 *
 * aria-hidden, and with nothing focusable inside, so it is a shape rather than a control: it must
 * not be reachable by tab or by screen reader while there is nothing behind it.
 */
export const ShowMorePlaceholder = (): React.ReactNode => (
  <div
    aria-hidden="true"
    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-transparent p-2.5 text-xs font-medium text-transparent select-none"
  >
    <span className="h-3.5 w-3.5" />
    Show more
  </div>
)

export interface ResumeCardProps {
  address: string
  /** Whether the card's requests are done. A shimmer must not outlive the thing it is waiting for. */
  isSettled: boolean
  roster?: string
  sessionId: string
  state: CardState
  time: TimeNote
  onDismiss: () => void
}

export const ResumeCard = ({
  address,
  isSettled,
  onDismiss,
  roster,
  sessionId,
  state,
  time,
}: ResumeCardProps): React.ReactNode => {
  // The urgent state borrows the amber fill/stroke ratio .arena-eyebrow already establishes, rather
  // than introducing a new device for it.
  // Amber says this card wants you: a vote that is blocking other people, or an answer you have not
  // read. A winner card is only ever an unread one — markWinnerSeen fires on the winner screen and
  // readJoinedSessions drops the flagged ones — so it is always news, and news gets the accent.
  //
  // At most two of the three visible cards can be amber, which is what keeps it from meaning nothing.
  const isUrgent = state.kind === 'your-turn' || state.kind === 'winner'

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
            <IdentityLine isSettled={isSettled} roster={roster} state={state} />
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
