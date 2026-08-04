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
    it('should not register on mount outside production', () => {
      renderHook(() => useServiceWorker())

      expect(mockRegister).not.toHaveBeenCalled()
    })
  })
})
