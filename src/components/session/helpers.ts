import { SessionData, User, VerifyResult } from '@types'

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

/**
 * Map a phone-verification result to the toast that should be shown for it.
 * Verified → success; locked (attempts exhausted, terminal) → danger with no
 * next step; otherwise a mismatch, showing how many attempts remain.
 */
export const pinResultToast = (
  result: VerifyResult,
): { severity: 'success' | 'warning' | 'danger'; message: string } => {
  if (result.verified) {
    return { severity: 'success', message: 'Your number is verified — you can now turn on round reminders.' }
  }
  if (result.locked) {
    return { severity: 'danger', message: "You've run out of attempts to verify this number." }
  }
  const n = result.attemptsRemaining ?? 0
  return { severity: 'warning', message: `That code didn't match. ${n} ${n === 1 ? 'try' : 'tries'} left.` }
}
