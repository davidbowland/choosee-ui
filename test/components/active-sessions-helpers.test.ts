import { deriveCardState, deriveRoster, deriveTimeNote, formatRoster } from '@components/active-sessions/helpers'
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

const marcusVoted: User = { name: 'Marcus', userId: 'user-2', votes: [['a'], ['a']] }
const marcusUnvoted: User = { name: 'Marcus', userId: 'user-2', votes: [['a'], []] }
const anonUnvoted: User = { name: null, userId: 'user-3', votes: [['a'], []] }

// One vote outstanding, so the session's own count agrees with the voter list that there is exactly
// one holdout. Naming somebody requires both to agree.
const oneOutstanding: SessionData = { ...session, voterCount: 2, votersSubmitted: 1 }

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
      remaining: 2,
      round: 2,
      totalRounds: 3,
      waitingOn: undefined,
    })
  })

  it('names the one person the round is waiting on', () => {
    expect(
      deriveCardState({ cached, session: oneOutstanding, userId: 'user-1', users: [voted, marcusUnvoted] }),
    ).toEqual({ kind: 'waiting', remaining: 1, round: 2, totalRounds: 3, waitingOn: 'Marcus' })
  })

  // The count and the voter list are two different sources. When the list has more holdouts than the
  // session admits to, one of them is stale, and picking a name out of the list would be a guess.
  it('names nobody when the voter list and the session disagree on how many are left', () => {
    expect(
      deriveCardState({
        cached,
        session: oneOutstanding,
        userId: 'user-1',
        users: [voted, marcusUnvoted, anonUnvoted],
      }),
    ).toEqual({ kind: 'waiting', remaining: 1, round: 2, totalRounds: 3, waitingOn: undefined })
  })

  it('names nobody when the one person outstanding never set a name', () => {
    expect(deriveCardState({ cached, session: oneOutstanding, userId: 'user-1', users: [voted, anonUnvoted] })).toEqual(
      {
        kind: 'waiting',
        remaining: 1,
        round: 2,
        totalRounds: 3,
        waitingOn: undefined,
      },
    )
  })

  // Not a real state — the round turns over once the last vote lands — but the client can hold a
  // session and a voter list from either side of that turn.
  it('reports no one outstanding when every vote is already in', () => {
    expect(
      deriveCardState({
        cached,
        session: { ...session, voterCount: 2, votersSubmitted: 2 },
        userId: 'user-1',
        users: [voted, marcusVoted],
      }),
    ).toEqual({ kind: 'waiting', remaining: 0, round: 2, totalRounds: 3, waitingOn: undefined })
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
      remaining: 2,
      round: 2,
      totalRounds: 3,
      waitingOn: undefined,
    })
  })
})

describe('deriveRoster', () => {
  it('reads the stored names before the voter list arrives', () => {
    expect(deriveRoster({ cached: ['Marcus', 'Priya'], userId: 'user-1' })).toEqual(['Marcus', 'Priya'])
  })

  it('has nothing to say for a record stored before names existed', () => {
    expect(deriveRoster({ userId: 'user-1' })).toEqual([])
  })

  it('names everyone but you once the voter list arrives', () => {
    expect(deriveRoster({ userId: 'user-1', users: [voted, marcusVoted] })).toEqual(['Marcus'])
  })

  it('leaves out anyone who has not named themselves', () => {
    expect(deriveRoster({ userId: 'user-1', users: [voted, marcusVoted, anonUnvoted] })).toEqual(['Marcus'])
  })

  // The live list is the truth, including when the truth is that nobody else is here. A Choosee
  // whose companions have gone should stop claiming them, not keep painting a stale roster.
  it('drops the stored names once the voter list contradicts them', () => {
    expect(deriveRoster({ cached: ['Marcus', 'Priya'], userId: 'user-1', users: [voted] })).toEqual([])
  })
})

describe('formatRoster', () => {
  it('has no line to draw for an empty roster', () => {
    expect(formatRoster([])).toBeUndefined()
  })

  it('names one person plainly', () => {
    expect(formatRoster(['Marcus'])).toBe('Marcus')
  })

  it('joins two with an ampersand', () => {
    expect(formatRoster(['Marcus', 'Dana'])).toBe('Marcus & Dana')
  })

  it('joins three with a comma and an ampersand', () => {
    expect(formatRoster(['Marcus', 'Dana', 'Priya'])).toBe('Marcus, Dana & Priya')
  })

  // Past three the tail becomes a count. A fourth name would push the line into an ellipsis through
  // the middle of somebody's name, which reads as a bug rather than as brevity.
  it('counts the tail once the roster outgrows the line', () => {
    expect(formatRoster(['Marcus', 'Dana', 'Priya', 'Jordan'])).toBe('Marcus, Dana & 2 others')
  })

  it('counts a long tail the same way', () => {
    expect(formatRoster(['Marcus', 'Dana', 'Priya', 'Jordan', 'Rae', 'Sam'])).toBe('Marcus, Dana & 4 others')
  })
})

describe('deriveTimeNote', () => {
  const joinedAt = 1_700_000_000_000
  const minutes = (count: number): number => joinedAt + count * 60 * 1000
  const at = (ms: number) => (): number => ms

  it('says just now for a Choosee joined seconds ago', () => {
    expect(deriveTimeNote(joinedAt, at(joinedAt + 30_000))).toEqual({ isExpiring: false, text: 'Just now' })
  })

  it('counts the minutes for the first hour', () => {
    expect(deriveTimeNote(joinedAt, at(minutes(42)))).toEqual({ isExpiring: false, text: '42m ago' })
  })

  it('counts the hours after that', () => {
    expect(deriveTimeNote(joinedAt, at(minutes(3 * 60 + 20)))).toEqual({ isExpiring: false, text: '3h ago' })
  })

  // The whole point of the line. A Choosee dies 24 hours after it is created and nothing else in the
  // app says so, so the last two hours are the only chance anyone gets to be told.
  it('switches to a countdown for the last two hours', () => {
    expect(deriveTimeNote(joinedAt, at(minutes(23 * 60)))).toEqual({ isExpiring: true, text: '1 hr left' })
  })

  it('counts the minutes down through the last hour', () => {
    expect(deriveTimeNote(joinedAt, at(minutes(23 * 60 + 20)))).toEqual({ isExpiring: true, text: '40 min left' })
  })

  it('reports the final minute as a state rather than a number', () => {
    expect(deriveTimeNote(joinedAt, at(minutes(24 * 60 - 1) + 30_000))).toEqual({
      isExpiring: true,
      text: 'Expiring now',
    })
  })

  // A device whose clock has been set forward reads as expired. Sharing the branch with the final
  // minute keeps a negative number off the card.
  it('reports a clock-skewed record as expiring rather than as a negative countdown', () => {
    expect(deriveTimeNote(joinedAt, at(minutes(30 * 60)))).toEqual({ isExpiring: true, text: 'Expiring now' })
  })
})
