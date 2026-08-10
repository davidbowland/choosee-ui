import { hasStatusCode } from '@services/api'
import { SessionData, User } from '@types'

/**
 * Message for a session request that failed before any data arrived.
 *
 * Deliberately says nothing about a link. A person can arrive here having typed a code someone read
 * out to them, so "check the link" names a thing they may never have had. The two exits are named by
 * the controls beneath it instead — enter the code again, or start a new Choosee.
 *
 * Subjectless, like every other failure in the app ("Couldn't join.", "Couldn't save that."), and the
 * same words the entry sheet uses for the same failure, so it reads identically whichever door the
 * user came through.
 *
 * Users never see the word "session": everywhere else the thing is a Choosee.
 */
export function sessionLoadErrorMessage(error: unknown): string {
  if (hasStatusCode(error, 404)) {
    return "Couldn't find this Choosee. They only last 24 hours."
  }
  return "Couldn't load this Choosee. Check your connection and try again."
}

/** True when the failure is the Choosee being gone, rather than the network being unavailable. */
export function isSessionNotFound(error: unknown): boolean {
  return hasStatusCode(error, 404)
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
