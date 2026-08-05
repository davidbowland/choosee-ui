import {
  JoinedSession,
  dismissSession,
  findJoinedSession,
  forgetSession,
  markWinnerSeen,
  readJoinedSessions,
  rememberSession,
} from '@utils/joined-sessions'

const NOW = 1_700_000_000_000
const HOUR = 60 * 60 * 1000
const now = () => NOW

const entry = (overrides: Partial<JoinedSession> = {}): JoinedSession => ({
  sessionId: 'abcd',
  userId: 'user-1',
  address: '4102 Main St',
  currentRound: 1,
  totalRounds: 3,
  joinedAt: NOW,
  ...overrides,
})

const seed = (sessions: JoinedSession[], version = 1): void => {
  localStorage.setItem('choosee.joined', JSON.stringify({ version, sessions }))
}

const setup = (): void => {
  localStorage.clear()
}

describe('joined-sessions', () => {
  describe('rememberSession', () => {
    it('round-trips an entry', () => {
      setup()
      rememberSession(
        { sessionId: 'abcd', userId: 'user-1', address: '4102 Main St', currentRound: 1, totalRounds: 3 },
        now,
      )

      expect(readJoinedSessions(now)).toEqual([entry()])
    })

    it('keeps the original joinedAt when rejoining, so returning cannot extend the TTL', () => {
      setup()
      seed([entry({ joinedAt: NOW - 5 * HOUR })])

      rememberSession(
        { sessionId: 'abcd', userId: 'user-1', address: 'New address', currentRound: 2, totalRounds: 3 },
        now,
      )

      expect(readJoinedSessions(now)[0]).toEqual(
        expect.objectContaining({ address: 'New address', currentRound: 2, joinedAt: NOW - 5 * HOUR }),
      )
    })

    it('keeps a dismissed flag, so rejoining cannot resurrect a dismissed card', () => {
      setup()
      seed([entry({ dismissed: true })])

      rememberSession(
        { sessionId: 'abcd', userId: 'user-1', address: '4102 Main St', currentRound: 2, totalRounds: 3 },
        now,
      )

      expect(readJoinedSessions(now)).toEqual([])
      expect(findJoinedSession('abcd', now)).toEqual(expect.objectContaining({ userId: 'user-1' }))
    })
  })

  describe('readJoinedSessions', () => {
    it('returns newest first', () => {
      setup()
      seed([
        entry({ sessionId: 'old', joinedAt: NOW - 3 * HOUR }),
        entry({ sessionId: 'new', joinedAt: NOW - 1 * HOUR }),
      ])

      expect(readJoinedSessions(now).map((e) => e.sessionId)).toEqual(['new', 'old'])
    })

    it('caps the list at three, keeping the newest', () => {
      setup()
      seed([1, 2, 3, 4].map((n) => entry({ sessionId: `s${n}`, joinedAt: NOW - n * HOUR })))

      expect(readJoinedSessions(now).map((e) => e.sessionId)).toEqual(['s1', 's2', 's3'])
    })

    it('drops entries past the 24 hour TTL', () => {
      setup()
      seed([
        entry({ sessionId: 'fresh', joinedAt: NOW - 23 * HOUR }),
        entry({ sessionId: 'stale', joinedAt: NOW - 25 * HOUR }),
      ])

      expect(readJoinedSessions(now).map((e) => e.sessionId)).toEqual(['fresh'])
    })

    it('hides dismissed entries', () => {
      setup()
      seed([entry({ dismissed: true })])

      expect(readJoinedSessions(now)).toEqual([])
    })

    it('hides entries whose winner has been seen', () => {
      setup()
      seed([entry({ winnerSeen: true })])

      expect(readJoinedSessions(now)).toEqual([])
    })

    it('returns empty for unparseable JSON', () => {
      setup()
      localStorage.setItem('choosee.joined', 'not json {{{')

      expect(readJoinedSessions(now)).toEqual([])
    })

    it('returns empty for an unrecognised record version', () => {
      setup()
      seed([entry()], 99)

      expect(readJoinedSessions(now)).toEqual([])
    })

    it('drops entries missing required fields', () => {
      setup()
      localStorage.setItem('choosee.joined', JSON.stringify({ version: 1, sessions: [{ sessionId: 'abcd' }] }))

      expect(readJoinedSessions(now)).toEqual([])
    })

    it('returns empty when storage throws', () => {
      setup()
      jest.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
        throw new Error('SecurityError')
      })

      expect(readJoinedSessions(now)).toEqual([])
    })
  })

  describe('findJoinedSession', () => {
    it('finds an entry by session id', () => {
      setup()
      seed([entry()])

      expect(findJoinedSession('abcd', now)?.userId).toBe('user-1')
    })

    // The assertion standing between this design and silently logging people out of
    // Choosees they dismissed. A flag hides a card; it does not revoke who you are.
    it('still returns a dismissed entry, so dismissing a card never costs you your identity', () => {
      setup()
      seed([entry({ dismissed: true })])

      expect(findJoinedSession('abcd', now)?.userId).toBe('user-1')
    })

    it('still returns an entry whose winner has been seen', () => {
      setup()
      seed([entry({ winnerSeen: true })])

      expect(findJoinedSession('abcd', now)?.userId).toBe('user-1')
    })

    it('does not return an entry past the TTL', () => {
      setup()
      seed([entry({ joinedAt: NOW - 25 * HOUR })])

      expect(findJoinedSession('abcd', now)).toBeUndefined()
    })

    it('returns undefined for an unknown session', () => {
      setup()
      seed([entry()])

      expect(findJoinedSession('nope', now)).toBeUndefined()
    })
  })

  describe('flags and deletion', () => {
    it('dismissSession hides the card', () => {
      setup()
      seed([entry()])

      dismissSession('abcd')

      expect(readJoinedSessions(now)).toEqual([])
    })

    it('markWinnerSeen hides the card', () => {
      setup()
      seed([entry()])

      markWinnerSeen('abcd')

      expect(readJoinedSessions(now)).toEqual([])
    })

    it('forgetSession removes exactly one entry', () => {
      setup()
      seed([entry({ sessionId: 'keep' }), entry({ sessionId: 'drop' })])

      forgetSession('drop')

      expect(readJoinedSessions(now).map((e) => e.sessionId)).toEqual(['keep'])
    })

    it('swallows a write that storage refuses', () => {
      setup()
      seed([entry()])
      jest.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
        throw new Error('QuotaExceededError')
      })

      expect(() => dismissSession('abcd')).not.toThrow()
    })
  })
})
