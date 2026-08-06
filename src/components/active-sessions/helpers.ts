import { firstUnvotedIndex } from '@components/session/helpers'
import { ChoicesMap, SessionData, User } from '@types'
import { TTL_MS } from '@utils/joined-sessions'

export type CardState =
  | { kind: 'loading'; round: number; totalRounds: number }
  | { kind: 'your-turn'; round: number; totalRounds: number }
  | { kind: 'waiting'; round: number; totalRounds: number; remaining: number; waitingOn: string | undefined }
  | { kind: 'winner'; winnerName: string | undefined }

export interface CardStateInput {
  /** The round as last stored on this device, so the card can say something before any request lands. */
  cached: { currentRound: number; totalRounds: number }
  session?: SessionData
  users?: User[]
  choices?: ChoicesMap
  userId: string
}

/**
 * Which of the three cards to draw. `round` comes out 1-based and ready to display: currentRound is
 * an array index everywhere else in the app, and the tournament header already adds one.
 *
 * Even `loading` carries a round. The round is local data, so making it wait on the network would
 * leave a card that has everything it needs to be useful showing a bare shimmer instead — and would
 * leave the round fields on the stored record with no reader at all.
 */
export function deriveCardState({ cached, choices, session, userId, users }: CardStateInput): CardState {
  if (!session) {
    return { kind: 'loading', round: cached.currentRound + 1, totalRounds: cached.totalRounds }
  }

  // Ahead of the users guard: a concluded Choosee has a winner to name whether or not the voter
  // list has arrived, and there is no voting state left to report.
  if (session.winner != null) {
    return { kind: 'winner', winnerName: choices?.[session.winner]?.name }
  }

  // Once the session is here its round supersedes the cached one, even while the voters load — but
  // only if it is ready. A not-ready session has an empty bracket and zeroed rounds, which would
  // render "Round 1 of 0"; the cached values are the last ones known to be real. The users query and
  // the write-back effect both guard on isReady for the same reason.
  const round = session.isReady ? session.currentRound + 1 : cached.currentRound + 1
  const totalRounds = session.isReady ? session.totalRounds : cached.totalRounds

  if (!users) return { kind: 'loading', round, totalRounds }

  const currentUser = users.find((user) => user.userId === userId)

  // No matching user means the stored identity is stale. Round progress is still true; a claim about
  // whose turn it is would not be.
  if (currentUser && firstUnvotedIndex(session, currentUser) !== -1) {
    return { kind: 'your-turn', round, totalRounds }
  }

  return {
    kind: 'waiting',
    remaining: session.voterCount - session.votersSubmitted,
    round,
    totalRounds,
    waitingOn: findWaitingOn(session, users),
  }
}

/**
 * The one person the round is waiting on, when it is unambiguously one person.
 *
 * The count comes from the session and the name comes from the voter list, and those are two
 * different sources that can disagree — a voter list that has not caught up, a voter with no name.
 * Naming somebody who is not actually the holdout is worse than not naming anybody, so this only
 * answers when both sources agree there is exactly one, and that one has a name.
 */
const findWaitingOn = (session: SessionData, users: User[]): string | undefined => {
  if (session.voterCount - session.votersSubmitted !== 1) return undefined
  const outstanding = users.filter((user) => firstUnvotedIndex(session, user) !== -1)
  return outstanding.length === 1 ? (outstanding[0].name ?? undefined) : undefined
}

export interface RosterInput {
  /** The names as last stored on this device, so the roster is on screen before any request lands. */
  cached?: string[]
  users?: User[]
  userId: string
}

/**
 * Who you are deciding with. Excludes this device's own voter and anyone who has not named
 * themselves — an unnamed voter contributes nothing a reader could recognise.
 *
 * The live list wins outright once it arrives, including when it yields nobody: a Choosee that is
 * genuinely solo should stop claiming company the moment we know better.
 */
export function deriveRoster({ cached, userId, users }: RosterInput): string[] {
  if (!users) return cached ?? []
  return users.filter((user) => user.userId !== userId && user.name).map((user) => user.name as string)
}

/**
 * The roster as one line that cannot outgrow the card. Past three names the tail becomes a count,
 * which degrades far better than an ellipsis through the middle of somebody's name.
 */
export function formatRoster(names: string[]): string | undefined {
  if (names.length === 0) return undefined
  if (names.length === 1) return names[0]
  if (names.length <= 3) return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`
  return `${names[0]}, ${names[1]} & ${names.length - 2} others`
}

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS

/** Below this much of the TTL left, the card stops reporting age and starts reporting mortality. */
const EXPIRY_WARNING_MS = 2 * HOUR_MS

export interface TimeNote {
  text: string
  isExpiring: boolean
}

/**
 * The card's quiet third line, which is the only place in the app that admits a Choosee expires.
 *
 * Age for most of the day, a countdown for the last two hours. A countdown that ran the whole time
 * would nag for twenty-two hours to be useful for two.
 */
export function deriveTimeNote(joinedAt: number, now = Date.now): TimeNote {
  const at = now()
  const remaining = joinedAt + TTL_MS - at

  if (remaining < EXPIRY_WARNING_MS) {
    // Also the branch a clock skew lands in, which is why it reads as a state and not a negative number.
    if (remaining < MINUTE_MS) return { isExpiring: true, text: 'Expiring now' }
    if (remaining < HOUR_MS) return { isExpiring: true, text: `${Math.floor(remaining / MINUTE_MS)} min left` }
    return { isExpiring: true, text: '1 hr left' }
  }

  const age = at - joinedAt
  if (age < MINUTE_MS) return { isExpiring: false, text: 'Just now' }
  if (age < HOUR_MS) return { isExpiring: false, text: `${Math.floor(age / MINUTE_MS)}m ago` }
  return { isExpiring: false, text: `${Math.floor(age / HOUR_MS)}h ago` }
}
