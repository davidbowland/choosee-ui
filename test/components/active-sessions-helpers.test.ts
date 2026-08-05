import { deriveCardState } from '@components/active-sessions/helpers'
import { ChoicesMap, SessionData, User } from '@types'

const session: SessionData = {
  address: '4102 Main St',
  bracket: [[['a', 'b']], [['a', 'c']], [['a', 'd']]],
  byes: [null, null, null],
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

const voted: User = { name: 'Dana', userId: 'user-1', votes: [['a'], ['a']] }
const unvoted: User = { name: 'Dana', userId: 'user-1', votes: [['a'], []] }
const freshJoiner: User = { name: 'Dana', userId: 'user-1', votes: [] }

const choices: ChoicesMap = {
  'choice-1': { choiceId: 'choice-1', name: 'Gates Bar-B-Q', photos: [] },
}

// Deliberately different from the session's round, so a test that reads the cached round when it
// should read the live one — or the reverse — fails instead of coincidentally agreeing.
const cached = { currentRound: 0, totalRounds: 3 }

describe('deriveCardState', () => {
  it('reports the cached round before the session arrives', () => {
    expect(deriveCardState({ cached, userId: 'user-1' })).toEqual({ kind: 'loading', round: 1, totalRounds: 3 })
  })

  it('prefers the live round over the cached one once the session arrives', () => {
    expect(deriveCardState({ cached, session, userId: 'user-1' })).toEqual({
      kind: 'loading',
      round: 2,
      totalRounds: 3,
    })
  })

  it('reports your turn when the current round has an unvoted matchup', () => {
    expect(deriveCardState({ cached, session, userId: 'user-1', users: [unvoted] })).toEqual({
      kind: 'your-turn',
      round: 2,
      totalRounds: 3,
    })
  })

  // The most common state for a card that was just created: joined, no votes cast at all. Relies on
  // firstUnvotedIndex tolerating a votes array shorter than the matchup list.
  it('reports your turn for someone who has not voted at all yet', () => {
    expect(deriveCardState({ cached, session, userId: 'user-1', users: [freshJoiner] })).toEqual({
      kind: 'your-turn',
      round: 2,
      totalRounds: 3,
    })
  })

  it('reports waiting when every matchup in the round has a vote', () => {
    expect(deriveCardState({ cached, session, userId: 'user-1', users: [voted] })).toEqual({
      kind: 'waiting',
      round: 2,
      totalRounds: 3,
      voterCount: 4,
      votersSubmitted: 2,
    })
  })

  it('reports the winner by name', () => {
    expect(
      deriveCardState({
        cached,
        choices,
        session: { ...session, winner: 'choice-1' },
        userId: 'user-1',
        users: [unvoted],
      }),
    ).toEqual({ kind: 'winner', winnerName: 'Gates Bar-B-Q' })
  })

  it('reports a winner with no name yet while the choices are still loading', () => {
    expect(
      deriveCardState({ cached, session: { ...session, winner: 'choice-1' }, userId: 'user-1', users: [unvoted] }),
    ).toEqual({ kind: 'winner', winnerName: undefined })
  })

  // Pins the guard ordering. Task 5 gates the users query on isReady and never refetches it, so a
  // winner checked *after* the users guard would leave a finished Choosee shimmering forever. Without
  // this test the ordering is protected only by a comment: every other case here supplies users.
  it('reports the winner even when the voter list has not arrived', () => {
    expect(deriveCardState({ cached, choices, session: { ...session, winner: 'choice-1' }, userId: 'user-1' })).toEqual(
      { kind: 'winner', winnerName: 'Gates Bar-B-Q' },
    )
  })

  // A stored identity the server no longer lists. Round progress is still true and still useful;
  // claiming it is or is not your turn would not be.
  it('falls back to waiting when the stored identity is not among the users', () => {
    expect(deriveCardState({ cached, session, userId: 'ghost', users: [voted] })).toEqual({
      kind: 'waiting',
      round: 2,
      totalRounds: 3,
      voterCount: 4,
      votersSubmitted: 2,
    })
  })
})
