import { hasStatusCode } from '@services/api'
import { SessionData, User } from '@types'

/**
 * Message for a session request that failed before any data arrived. A 404 is
 * terminal — the session is gone — so it says so instead of inviting a retry.
 * Users never see the word "session": everywhere else the thing is a Choosee.
 */
export function sessionLoadErrorMessage(error: unknown): string {
  if (hasStatusCode(error, 404)) {
    return "We can't find this Choosee. They expire 24 hours after they start — check the link, or start a new one."
  }
  return "We couldn't load this Choosee. Check your connection and try again."
}

/**
 * True when the round in progress is the last one, so closing it produces a winner
 * rather than another round. Uses the same signal the tournament header displays
 * ("Round 3 / 3"), keeping the copy consistent with the number on screen.
 */
export function isFinalRound(session: SessionData): boolean {
  return session.currentRound + 1 >= session.totalRounds
}

/**
 * Find the index of the first unvoted matchup for a user in the current round.
 * Returns -1 when every matchup has a vote.
 *
 * votes may be shorter than matchups (e.g. a fresh user with an empty votes
 * array), so we iterate over matchup indices rather than vote entries.
 */
export function firstUnvotedIndex(session: SessionData, user: User): number {
  const round = session.currentRound
  const matchups = session.bracket[round] ?? []
  const votes = user.votes[round] ?? []
  for (let i = 0; i < matchups.length; i++) {
    if (votes[i] == null) return i
  }
  return -1
}
