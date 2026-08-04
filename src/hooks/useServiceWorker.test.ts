import { registerServiceWorker, useServiceWorker } from './useServiceWorker'
import { renderHook } from '@testing-library/react'

describe('useServiceWorker', () => {
  const mockRegister = jest.fn()
  const mockAddEventListener = jest.fn()
  const mockReload = jest.fn()

  const containerWith = (controller: unknown): ServiceWorkerContainer =>
    ({
      addEventListener: mockAddEventListener,
      controller,
      register: mockRegister,
    }) as unknown as ServiceWorkerContainer

  beforeAll(() => {
    mockRegister.mockResolvedValue({ scope: '/' })
  })

  describe('registerServiceWorker', () => {
    it('should register the worker in production', async () => {
      await registerServiceWorker(containerWith(null), '/sw.js', true, mockReload)

      expect(mockRegister).toHaveBeenCalledWith('/sw.js')
    })

    it('should not register outside production', async () => {
      await registerServiceWorker(containerWith(null), '/sw.js', false, mockReload)

      expect(mockRegister).not.toHaveBeenCalled()
    })

    it('should not register without a service worker container', async () => {
      const result = await registerServiceWorker(undefined, '/sw.js', true, mockReload)

      expect(result).toBeUndefined()
    })

    it('should resolve undefined when registration throws', async () => {
      mockRegister.mockRejectedValueOnce(new Error('blocked'))

      const result = await registerServiceWorker(containerWith(null), '/sw.js', true, mockReload)

      expect(result).toBeUndefined()
    })

    it('should reload when a new worker takes over a page an old one controlled', async () => {
      await registerServiceWorker(containerWith({}), '/sw.js', true, mockReload)
      const [, handler] = mockAddEventListener.mock.calls[0]
      handler()

      expect(mockReload).toHaveBeenCalledTimes(1)
    })

    it('should reload only once when controllerchange fires repeatedly', async () => {
      await registerServiceWorker(containerWith({}), '/sw.js', true, mockReload)
      const [, handler] = mockAddEventListener.mock.calls[0]
      handler()
      handler()

      expect(mockReload).toHaveBeenCalledTimes(1)
    })

    it('should not reload on a first registration with no controller', async () => {
      await registerServiceWorker(containerWith(null), '/sw.js', true, mockReload)

      expect(mockAddEventListener).not.toHaveBeenCalled()
    })
  })

  describe('useServiceWorker', () => {
    // This asserted `mockRegister` was not called after rendering the hook — but the hook resolves
    // its own container from `navigator.serviceWorker`, which jsdom does not define, so the local
    // mock was never reachable and the expectation held no matter what the hook did. Deleting the
    // production guard entirely left it green. Define the container so the guard is what decides.
    const withServiceWorkerContainer = (run: () => void): void => {
      const original = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker')
      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: containerWith(null),
        writable: true,
      })
      try {
        run()
      } finally {
        // jsdom leaves `serviceWorker` undefined, so there is nothing to restore in that case —
        // and it is a read-only property, so it cannot be deleted. Redefining it as undefined
        // returns the environment to what every other test in this file assumes.
        Object.defineProperty(navigator, 'serviceWorker', original ?? { configurable: true, value: undefined })
      }
    }

    it('should not register on mount outside production', () => {
      withServiceWorkerContainer(() => {
        renderHook(() => useServiceWorker())
      })

      expect(mockRegister).not.toHaveBeenCalled()
    })

    it('should register on mount in production', () => {
      withServiceWorkerContainer(() => {
        renderHook(() => useServiceWorker(true))
      })

      expect(mockRegister).toHaveBeenCalledWith('/sw.js')
    })
  })
})
