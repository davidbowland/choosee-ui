import { firstUnvotedIndex, pinResultToast } from '@components/session/helpers'
import { SessionData, User } from '@types'

const baseSession: SessionData = {
  sessionId: 'test',
  address: '123 Main St',
  location: { latitude: 0, longitude: 0 },
  currentRound: 0,
  totalRounds: 2,
  bracket: [
    [
      ['a', 'b'],
      ['c', 'd'],
    ],
  ],
  byes: [null],
  isReady: true,
  errorMessage: null,
  filterClosingSoon: false,
  users: [],
  winner: null,
  type: ['restaurant'],
  exclude: [],
  radius: 5000,
  rankBy: 'DISTANCE',
  voterCount: 2,
  votersSubmitted: 0,
}

const baseUser: User = {
  userId: 'user-1',
  name: 'Test',
  subscribedRounds: [],
  votes: [[null, null]],
  textsSent: 0,
}

describe('firstUnvotedIndex', () => {
  it('should return 0 when no votes cast', () => {
    expect(firstUnvotedIndex(baseSession, baseUser)).toBe(0)
  })

  it('should return 1 when first matchup voted', () => {
    const user = { ...baseUser, votes: [['a', null]] }
    expect(firstUnvotedIndex(baseSession, user)).toBe(1)
  })

  it('should return -1 when all matchups voted', () => {
    const user = { ...baseUser, votes: [['a', 'c']] }
    expect(firstUnvotedIndex(baseSession, user)).toBe(-1)
  })

  it('should return 0 when votes array is empty for round', () => {
    const user = { ...baseUser, votes: [] }
    expect(firstUnvotedIndex(baseSession, user)).toBe(0)
  })

  it('should return 0 when bracket round is undefined', () => {
    const session = { ...baseSession, currentRound: 5 }
    expect(firstUnvotedIndex(session, baseUser)).toBe(-1)
  })
})

describe('pinResultToast', () => {
  it('returns a success toast when verified', () => {
    expect(pinResultToast({ verified: true, locked: false })).toEqual({
      severity: 'success',
      message: 'Your number is verified — you can now turn on round reminders.',
    })
  })

  it('returns a danger toast when locked', () => {
    expect(pinResultToast({ verified: false, locked: true, attemptsRemaining: 0 })).toEqual({
      severity: 'danger',
      message: "You've run out of attempts to verify this number.",
    })
  })

  it('returns a warning toast with the remaining-attempt count on mismatch', () => {
    expect(pinResultToast({ verified: false, locked: false, attemptsRemaining: 5 })).toEqual({
      severity: 'warning',
      message: "That code didn't match. 5 tries left.",
    })
  })

  it('uses the singular for exactly one attempt left', () => {
    expect(pinResultToast({ verified: false, locked: false, attemptsRemaining: 1 })).toEqual({
      severity: 'warning',
      message: "That code didn't match. 1 try left.",
    })
  })
})
