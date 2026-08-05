import { useSessionIdentity } from './useSessionIdentity'
import { act, renderHook } from '@testing-library/react'
import * as joinedSessions from '@utils/joined-sessions'

jest.mock('@utils/joined-sessions')

const mocked = joinedSessions as jest.Mocked<typeof joinedSessions>

describe('useSessionIdentity', () => {
  // The second assertion is the one that matters. Without it, threading the wrong identifier into
  // the lookup — a plausible refactoring slip — leaves every test here green while, in production,
  // findJoinedSession returns undefined for every Choosee and every visit to /s/<id>, including
  // every notification tap on the installed iOS app, lands on "Back again? Choose your name". The
  // cookie hook this replaced asserted the equivalent; the refactor dropped it.
  it('looks the stored identity up by this session id', () => {
    mocked.findJoinedSession.mockReturnValueOnce({
      address: '4102 Main St',
      currentRound: 1,
      joinedAt: 1_700_000_000_000,
      sessionId: 'abcd',
      totalRounds: 3,
      userId: 'user-1',
    })

    const { result } = renderHook(() => useSessionIdentity('abcd'))

    expect(result.current.userId).toBe('user-1')
    expect(mocked.findJoinedSession).toHaveBeenCalledWith('abcd')
  })

  it('returns undefined when nothing is stored', () => {
    mocked.findJoinedSession.mockReturnValueOnce(undefined)

    const { result } = renderHook(() => useSessionIdentity('abcd'))

    expect(result.current.userId).toBeUndefined()
  })

  it('writes the whole record when an identity is set', () => {
    mocked.findJoinedSession.mockReturnValueOnce(undefined)

    const { result } = renderHook(() => useSessionIdentity('abcd'))
    act(() => {
      result.current.setUserId('user-2', { address: '18th & Vine', currentRound: 0, totalRounds: 2 })
    })

    expect(mocked.rememberSession).toHaveBeenCalledWith({
      address: '18th & Vine',
      currentRound: 0,
      sessionId: 'abcd',
      totalRounds: 2,
      userId: 'user-2',
    })
    expect(result.current.userId).toBe('user-2')
  })
})
