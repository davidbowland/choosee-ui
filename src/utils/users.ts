import { User } from '@types'

export function displayName(user: User): string {
  return user.name || user.userId.replace(/[^a-z]+/gi, ' ').trim()
}

// Takes the count rather than reading session.voterCount, because the two screens have different
// freshest sources. The waiting screen polls the session, so its snapshot is current. The voting
// screen does not poll at all, so there the users query — which refetches on its own interval — is
// the only count that keeps up with people joining mid-round.
export function isSoloVoter(voterCount: number, currentRound: number): boolean {
  return voterCount <= 1 && currentRound === 0
}
