import { deriveCardState } from '@components/active-sessions/helpers'
import { ChoicesMap, SessionData, User } from '@types'

const session: SessionData = {
  address: '4102 Main St',
  bracket: [[['a', 'b']], [['a', 'c']]],
  byes: [null, null],
  currentRound: 1,
  errorMessage: null,
  exclude: [],
  filterClosingSoon: false,
  isReady: true,
  location: { latitude: 0, longitude: 0 },
  radius: 5000,
  rankBy: 'DISTANCE',
  sessionId: 'abcd',
  totalRounds: 3,
  type: ['restaurant'],
  users: ['user-1'],
  voterCount: 4,
  votersSubmitted: 2,
  winner: null,
}

const voted: User = { name: 'Dana', subscribedRounds: [], userId: 'user-1', votes: [['a'], ['a']] }
const unvoted: User = { name: 'Dana', subscribedRounds: [], userId: 'user-1', votes: [['a'], []] }

const choices: ChoicesMap = {
  'choice-1': { choiceId: 'choice-1', name: 'Gates Bar-B-Q', photos: [] },
}

describe('deriveCardState', () => {
  it('is loading until the session arrives', () => {
    expect(deriveCardState({ userId: 'user-1' })).toEqual({ kind: 'loading' })
  })

  it('is loading while the session is present but the users are not', () => {
    expect(deriveCardState({ session, userId: 'user-1' })).toEqual({ kind: 'loading' })
  })

  it('reports your turn when the current round has an unvoted matchup', () => {
    expect(deriveCardState({ session, userId: 'user-1', users: [unvoted] })).toEqual({
      kind: 'your-turn',
      round: 2,
      totalRounds: 3,
    })
  })

  it('reports waiting when every matchup in the round has a vote', () => {
    expect(deriveCardState({ session, userId: 'user-1', users: [voted] })).toEqual({
      kind: 'waiting',
      round: 2,
      totalRounds: 3,
      voterCount: 4,
      votersSubmitted: 2,
    })
  })

  it('reports the winner by name, ahead of any voting state', () => {
    expect(
      deriveCardState({ choices, session: { ...session, winner: 'choice-1' }, userId: 'user-1', users: [unvoted] }),
    ).toEqual({ kind: 'winner', winnerName: 'Gates Bar-B-Q' })
  })

  it('reports a winner with no name yet while the choices are still loading', () => {
    expect(
      deriveCardState({ session: { ...session, winner: 'choice-1' }, userId: 'user-1', users: [unvoted] }),
    ).toEqual({ kind: 'winner', winnerName: undefined })
  })

  // A stored identity the server no longer lists. Round progress is still true and still useful;
  // claiming it is or is not your turn would not be.
  it('falls back to waiting when the stored identity is not among the users', () => {
    expect(deriveCardState({ session, userId: 'ghost', users: [voted] })).toEqual({
      kind: 'waiting',
      round: 2,
      totalRounds: 3,
      voterCount: 4,
      votersSubmitted: 2,
    })
  })
})
