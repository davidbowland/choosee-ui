import { usePushResubscribe } from './usePushResubscribe'
import { postPushSubscription } from '@services/api'
import { renderHook } from '@testing-library/react'

jest.mock('@services/api')

describe('usePushResubscribe', () => {
  const subscription = {
    endpoint: 'https://fcm.googleapis.com/send/fresh',
    keys: { auth: 'auth-key', p256dh: 'p256dh-key' },
  }
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

  beforeAll(() => {
    jest.mocked(postPushSubscription).mockResolvedValue()
  })

  it('should re-register a rotated subscription against the current session', () => {
    renderHook(() => usePushResubscribe('fuzzy-penguin', 'brave-tiger', container))

    fire({ subscription, type: 'push-resubscribed' })

    expect(postPushSubscription).toHaveBeenCalledWith('fuzzy-penguin', 'brave-tiger', subscription)
  })

  it('should ignore messages of other types', () => {
    renderHook(() => usePushResubscribe('fuzzy-penguin', 'brave-tiger', container))

    fire({ type: 'something-else' })

    expect(postPushSubscription).not.toHaveBeenCalled()
  })

  it('should ignore a resubscribe message that carries no subscription', () => {
    renderHook(() => usePushResubscribe('fuzzy-penguin', 'brave-tiger', container))

    fire({ type: 'push-resubscribed' })

    expect(postPushSubscription).not.toHaveBeenCalled()
  })

  it('should do nothing without a user identity yet', () => {
    renderHook(() => usePushResubscribe('fuzzy-penguin', undefined, container))

    fire({ subscription, type: 'push-resubscribed' })

    expect(postPushSubscription).not.toHaveBeenCalled()
  })

  it('should stop listening once the session unmounts', () => {
    const { unmount } = renderHook(() => usePushResubscribe('fuzzy-penguin', 'brave-tiger', container))

    unmount()
    fire({ subscription, type: 'push-resubscribed' })

    expect(postPushSubscription).not.toHaveBeenCalled()
  })

  it('should swallow a failed re-registration', () => {
    jest.mocked(postPushSubscription).mockRejectedValueOnce(new Error('offline'))
    renderHook(() => usePushResubscribe('fuzzy-penguin', 'brave-tiger', container))

    expect(() => fire({ subscription, type: 'push-resubscribed' })).not.toThrow()
  })

  // Passing `undefined` made `container.addEventListener` unreachable by construction, so this
  // asserted nothing. Assert on the listener count instead — that observes the hook's behavior
  // rather than the arrangement's.
  it('should not listen at all when the browser has no service worker container', () => {
    const before = listeners.length

    renderHook(() => usePushResubscribe('fuzzy-penguin', 'brave-tiger', undefined))

    expect(listeners.length).toEqual(before)
  })

  // Guards the event name. The fake addEventListener ignored its type, so changing the hook to
  // listen for 'push-resubscribed' instead of 'message' left every test green while the worker's
  // postMessage was never heard.
  it('should listen for the message event specifically', () => {
    renderHook(() => usePushResubscribe('fuzzy-penguin', 'brave-tiger', container))

    expect(container.addEventListener).toHaveBeenCalledWith('message', expect.any(Function))
  })
})
