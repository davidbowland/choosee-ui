import { firstUnvotedIndex } from '@components/session/helpers'
import { ChoicesMap, SessionData, User } from '@types'

export type CardState =
  | { kind: 'loading'; round: number; totalRounds: number }
  | { kind: 'your-turn'; round: number; totalRounds: number }
  | { kind: 'waiting'; round: number; totalRounds: number; votersSubmitted: number; voterCount: number }
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

  const round = session.currentRound + 1

  // Once the session is here its round supersedes the cached one, even while the voters load.
  if (!users) return { kind: 'loading', round, totalRounds: session.totalRounds }

  const currentUser = users.find((user) => user.userId === userId)

  // No matching user means the stored identity is stale. Round progress is still true; a claim about
  // whose turn it is would not be.
  if (currentUser && firstUnvotedIndex(session, currentUser) !== -1) {
    return { kind: 'your-turn', round, totalRounds: session.totalRounds }
  }

  return {
    kind: 'waiting',
    round,
    totalRounds: session.totalRounds,
    voterCount: session.voterCount,
    votersSubmitted: session.votersSubmitted,
  }
}
