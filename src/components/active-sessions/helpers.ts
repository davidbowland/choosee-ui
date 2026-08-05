import { firstUnvotedIndex } from '@components/session/helpers'
import { ChoicesMap, SessionData, User } from '@types'

export type CardState =
  | { kind: 'loading' }
  | { kind: 'your-turn'; round: number; totalRounds: number }
  | { kind: 'waiting'; round: number; totalRounds: number; votersSubmitted: number; voterCount: number }
  | { kind: 'winner'; winnerName: string | undefined }

export interface CardStateInput {
  session?: SessionData
  users?: User[]
  choices?: ChoicesMap
  userId: string
}

/**
 * Which of the three cards to draw. `round` comes out 1-based and ready to display: currentRound is
 * an array index everywhere else in the app, and the tournament header already adds one.
 */
export function deriveCardState({ choices, session, userId, users }: CardStateInput): CardState {
  if (!session) return { kind: 'loading' }

  // Ahead of the users guard: a concluded Choosee has a winner to name whether or not the voter
  // list has arrived, and there is no voting state left to report.
  if (session.winner != null) {
    return { kind: 'winner', winnerName: choices?.[session.winner]?.name }
  }

  if (!users) return { kind: 'loading' }

  const round = session.currentRound + 1
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
