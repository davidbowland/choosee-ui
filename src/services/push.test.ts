import { deletePushSubscription, fetchVapidPublicKey, postPushSubscription } from './api'
import { isSubscribedToPush, subscribeToPush, unsubscribeFromPush, urlBase64ToUint8Array } from './push'

jest.mock('./api')

describe('push', () => {
  const sessionId = 'fuzzy-penguin'
  const userId = 'brave-tiger'
  const subscriptionJson = {
    endpoint: 'https://fcm.googleapis.com/send/abc',
    keys: { auth: 'auth-key', p256dh: 'p256dh-key' },
  }

  const mockSubscribe = jest.fn()
  const mockGetSubscription = jest.fn()
  const mockUnsubscribe = jest.fn()
  const mockRequestPermission = jest.fn()

  const registration = { pushManager: { getSubscription: mockGetSubscription, subscribe: mockSubscribe } }

  const containerWith = (ready: Promise<unknown>): ServiceWorkerContainer =>
    ({ ready }) as unknown as ServiceWorkerContainer

  const readyContainer = (): ServiceWorkerContainer => containerWith(Promise.resolve(registration))

  /** Installs a Notification global with the given permission behaviour. */
  const setupNotification = (permission: NotificationPermission = 'granted'): void => {
    mockRequestPermission.mockResolvedValue(permission)
    Object.defineProperty(globalThis, 'Notification', {
      configurable: true,
      value: { permission, requestPermission: mockRequestPermission },
      writable: true,
    })
  }

  /** Removes the Notification global entirely, as on iOS Safari outside a Home Screen app. */
  const removeNotification = (): void => {
    Object.defineProperty(globalThis, 'Notification', { configurable: true, value: undefined, writable: true })
  }

  beforeAll(() => {
    jest.mocked(fetchVapidPublicKey).mockResolvedValue({ publicKey: 'BFakePublicKey_-' })
    jest.mocked(postPushSubscription).mockResolvedValue()
    jest.mocked(deletePushSubscription).mockResolvedValue()
    mockSubscribe.mockResolvedValue({ toJSON: () => subscriptionJson })
    mockGetSubscription.mockResolvedValue({ endpoint: subscriptionJson.endpoint, unsubscribe: mockUnsubscribe })
    mockUnsubscribe.mockResolvedValue(true)
  })

  describe('urlBase64ToUint8Array', () => {
    it('should decode a base64url key into bytes', () => {
      expect(Array.from(urlBase64ToUint8Array('AQID'))).toEqual([1, 2, 3])
    })

    it('should pad a string whose length is not a multiple of four', () => {
      expect(urlBase64ToUint8Array('AQI').length).toEqual(2)
    })

    it('should translate the base64url alphabet back to standard base64', () => {
      expect(Array.from(urlBase64ToUint8Array('-_8'))).toEqual([251, 255])
    })
  })

  describe('subscribeToPush', () => {
    it('should subscribe and register the subscription with the API', async () => {
      setupNotification('granted')

      const result = await subscribeToPush(sessionId, userId, readyContainer())

      expect(mockSubscribe).toHaveBeenCalledWith({
        applicationServerKey: expect.any(Uint8Array),
        userVisibleOnly: true,
      })
      expect(postPushSubscription).toHaveBeenCalledWith(sessionId, userId, subscriptionJson)
      expect(result).toEqual('subscribed')
    })

    it('should ask permission before waiting for the worker, so user activation is not spent', async () => {
      setupNotification('granted')
      const order: string[] = []
      mockRequestPermission.mockImplementationOnce(() => {
        order.push('permission')
        return Promise.resolve('granted')
      })
      mockSubscribe.mockImplementationOnce(() => {
        order.push('subscribe')
        return Promise.resolve({ toJSON: () => subscriptionJson })
      })

      await subscribeToPush(sessionId, userId, readyContainer())

      expect(order).toEqual(['permission', 'subscribe'])
    })

    it('should report denied when the user refuses', async () => {
      setupNotification('denied')

      const result = await subscribeToPush(sessionId, userId, readyContainer())

      expect(result).toEqual('denied')
      expect(mockSubscribe).not.toHaveBeenCalled()
    })

    it('should report unsupported without a service worker container', async () => {
      setupNotification('granted')

      expect(await subscribeToPush(sessionId, userId, undefined)).toEqual('unsupported')
    })

    it('should report unsupported when the browser has no Notification API', async () => {
      removeNotification()

      expect(await subscribeToPush(sessionId, userId, readyContainer())).toEqual('unsupported')
    })

    it('should report unready rather than hanging when no worker ever activates', async () => {
      setupNotification('granted')

      const result = await subscribeToPush(sessionId, userId, containerWith(new Promise(() => undefined)), 10)

      expect(result).toEqual('unready')
    })

    it('should not fetch the VAPID key when the browser can never subscribe', async () => {
      setupNotification('denied')

      await subscribeToPush(sessionId, userId, readyContainer())

      expect(fetchVapidPublicKey).not.toHaveBeenCalled()
    })
  })

  describe('isSubscribedToPush', () => {
    it('should report true when a subscription exists', async () => {
      expect(await isSubscribedToPush(readyContainer())).toBe(true)
    })

    it('should report false when none exists', async () => {
      mockGetSubscription.mockResolvedValueOnce(null)

      expect(await isSubscribedToPush(readyContainer())).toBe(false)
    })

    it('should report false without a container', async () => {
      expect(await isSubscribedToPush(undefined)).toBe(false)
    })

    it('should report false rather than hang when no worker activates', async () => {
      expect(await isSubscribedToPush(containerWith(new Promise(() => undefined)), 10)).toBe(false)
    })

    it('should never request permission', async () => {
      setupNotification('default')

      await isSubscribedToPush(readyContainer())

      expect(mockRequestPermission).not.toHaveBeenCalled()
    })
  })

  describe('unsubscribeFromPush', () => {
    it('should unsubscribe the browser before telling the API', async () => {
      const order: string[] = []
      mockUnsubscribe.mockImplementationOnce(() => {
        order.push('browser')
        return Promise.resolve(true)
      })
      jest.mocked(deletePushSubscription).mockImplementationOnce(() => {
        order.push('api')
        return Promise.resolve()
      })

      await unsubscribeFromPush(sessionId, userId, readyContainer())

      expect(order).toEqual(['browser', 'api'])
    })

    it('should tell the API which endpoint went away', async () => {
      await unsubscribeFromPush(sessionId, userId, readyContainer())

      expect(deletePushSubscription).toHaveBeenCalledWith(sessionId, userId, subscriptionJson.endpoint)
    })

    it('should not reject when the API call fails, since the browser is already unsubscribed', async () => {
      jest.mocked(deletePushSubscription).mockRejectedValueOnce(new Error('offline'))

      await expect(unsubscribeFromPush(sessionId, userId, readyContainer())).resolves.toBeUndefined()
    })

    it('should do nothing when there is no subscription to remove', async () => {
      mockGetSubscription.mockResolvedValueOnce(null)

      await unsubscribeFromPush(sessionId, userId, readyContainer())

      expect(deletePushSubscription).not.toHaveBeenCalled()
    })

    it('should do nothing without a service worker container', async () => {
      await unsubscribeFromPush(sessionId, userId, undefined)

      expect(mockGetSubscription).not.toHaveBeenCalled()
    })

    it('should do nothing when no worker ever activates', async () => {
      await unsubscribeFromPush(sessionId, userId, containerWith(new Promise(() => undefined)), 10)

      expect(deletePushSubscription).not.toHaveBeenCalled()
    })
  })
})
