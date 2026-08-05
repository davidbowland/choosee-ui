import { useSessionIdentity } from './useSessionIdentity'
import { act, renderHook } from '@testing-library/react'
import * as joinedSessions from '@utils/joined-sessions'

jest.mock('@utils/joined-sessions')

const mocked = joinedSessions as jest.Mocked<typeof joinedSessions>

describe('useSessionIdentity', () => {
  it('returns the stored identity for the session', () => {
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
