import { ApiError } from 'aws-amplify/api'

import { firstUnvotedIndex, isFinalRound, sessionLoadErrorMessage } from '@components/session/helpers'
import { SessionData, User } from '@types'

function apiError(statusCode: number): ApiError {
  const error = Object.assign(new Error('Request failed'), {
    response: { statusCode, headers: {}, body: '{}' },
  })
  Object.setPrototypeOf(error, ApiError.prototype)
  return error as ApiError
}

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
  votes: [[null, null]],
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

describe('isFinalRound', () => {
  it('should be false while rounds remain after this one', () => {
    expect(isFinalRound({ ...baseSession, currentRound: 0, totalRounds: 3 })).toBe(false)
  })

  it('should be true on the last round', () => {
    expect(isFinalRound({ ...baseSession, currentRound: 2, totalRounds: 3 })).toBe(true)
  })

  it('should be true past the last round', () => {
    expect(isFinalRound({ ...baseSession, currentRound: 3, totalRounds: 3 })).toBe(true)
  })
})

describe('sessionLoadErrorMessage', () => {
  it('should report a missing session on 404', () => {
    expect(sessionLoadErrorMessage(apiError(404))).toContain("can't find this Choosee")
  })

  it('should report a load failure on other status codes', () => {
    expect(sessionLoadErrorMessage(apiError(500))).toContain("couldn't load this Choosee")
  })

  it('should report a load failure for non-API errors', () => {
    expect(sessionLoadErrorMessage(new Error('Network down'))).toContain("couldn't load this Choosee")
  })
})
