import { QueryClient } from '@tanstack/react-query'

import { useSessionRefresh } from './useSessionRefresh'
import { renderHook } from '@testing-library/react'

const queryClient = new QueryClient()

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => queryClient,
}))

describe('useSessionRefresh', () => {
  const listeners: Array<(event: MessageEvent) => void> = []

  // removeEventListener really removes: React's automatic cleanup unmounts each rendered hook
  // between tests, and a listener array that only ever grew would let one test's handler answer
  // the next test's message.
  const container = {
    addEventListener: jest.fn((_type: string, handler: (event: MessageEvent) => void) => {
      listeners.push(handler)
    }),
    removeEventListener: jest.fn((_type: string, handler: (event: MessageEvent) => void) => {
      listeners.splice(listeners.indexOf(handler), 1)
    }),
  } as unknown as ServiceWorkerContainer

  const fire = (data: unknown): void => listeners.forEach((handler) => handler({ data } as MessageEvent))

  let invalidateQueries: jest.SpyInstance

  beforeAll(() => {
    invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries').mockResolvedValue()
  })

  afterAll(() => {
    invalidateQueries.mockRestore()
  })

  it('should refetch the session the moment the worker says a notification was tapped', () => {
    renderHook(() => useSessionRefresh('fuzzy-penguin', container))

    fire({ sessionId: 'fuzzy-penguin', type: 'session-refresh' })

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['session', 'fuzzy-penguin'] })
  })

  // The voter list drives the waiting screen's count and the winner reveal, and it polls at 30s —
  // twice as stale as the session itself. Refreshing one without the other lands the tap on a
  // half-updated screen.
  it('should refetch the voter list alongside the session', () => {
    renderHook(() => useSessionRefresh('fuzzy-penguin', container))

    fire({ sessionId: 'fuzzy-penguin', type: 'session-refresh' })

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['users', 'fuzzy-penguin'] })
  })

  it('should ignore messages of other types', () => {
    renderHook(() => useSessionRefresh('fuzzy-penguin', container))

    fire({ sessionId: 'fuzzy-penguin', type: 'push-resubscribed' })

    expect(invalidateQueries).not.toHaveBeenCalled()
  })

  // Two Choosees open at once is the case this guards. Nothing else distinguishes the windows, so
  // without the id check a notification for one would refetch the other.
  it('should ignore a refresh meant for a different session', () => {
    renderHook(() => useSessionRefresh('fuzzy-penguin', container))

    fire({ sessionId: 'other-session', type: 'session-refresh' })

    expect(invalidateQueries).not.toHaveBeenCalled()
  })

  it('should stop listening once the session unmounts', () => {
    const { unmount } = renderHook(() => useSessionRefresh('fuzzy-penguin', container))

    unmount()
    fire({ sessionId: 'fuzzy-penguin', type: 'session-refresh' })

    expect(invalidateQueries).not.toHaveBeenCalled()
  })

  it('should not listen at all when the browser has no service worker container', () => {
    const before = listeners.length

    renderHook(() => useSessionRefresh('fuzzy-penguin', undefined))

    expect(listeners.length).toEqual(before)
  })

  // Guards the event name. The fake addEventListener ignores its type, so listening for
  // 'session-refresh' instead of 'message' would leave every test above green while the worker's
  // postMessage was never heard.
  it('should listen for the message event specifically', () => {
    renderHook(() => useSessionRefresh('fuzzy-penguin', container))

    expect(container.addEventListener).toHaveBeenCalledWith('message', expect.any(Function))
  })
})
