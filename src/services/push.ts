import { deletePushSubscription, fetchVapidPublicKey, postPushSubscription } from './api'

// 'unready' is deliberately NOT folded into 'unsupported'. They are different facts with different
// fixes: 'unsupported' means this browser cannot do Web Push, and 'unready' means it can but our
// worker is not running, which a reload often fixes. Telling a Firefox user their browser "can't
// turn on notifications" would be a plain lie.
export type PushResult = 'subscribed' | 'unsupported' | 'denied' | 'unready'

// Long enough to cover a registration still in flight when somebody taps quickly, short enough that
// nobody sits watching a button that will never finish.
export const READY_TIMEOUT_MS = 5_000

/* istanbul ignore next -- SSR/browser-support guard: the injected container path is what tests exercise */
const resolveContainer = (): ServiceWorkerContainer | undefined =>
  typeof navigator !== 'undefined' && typeof PushManager !== 'undefined' ? navigator.serviceWorker : undefined

// Convert a base64url VAPID public key into the Uint8Array that `applicationServerKey` requires.
// The `ArrayBuffer` type argument is load-bearing: `applicationServerKey` takes a BufferSource,
// which excludes the SharedArrayBuffer-backed views that a bare `Uint8Array` would also admit.
export const urlBase64ToUint8Array = (base64String: string): Uint8Array<ArrayBuffer> => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let index = 0; index < rawData.length; index += 1) {
    output[index] = rawData.charCodeAt(index)
  }
  return output
}

// `serviceWorker.ready` resolves only once an ACTIVE worker controls the scope. With no
// registration it does not reject — it stays pending FOREVER. Awaiting it bare would leave the
// notify switch on "Turning on…" with no error and no way back, and there are two ordinary routes
// to that state: registration is skipped outside production, and a register() that threw is
// swallowed by design. Both are silent, so this wait must be bounded.
const waitForWorker = async (
  swContainer: ServiceWorkerContainer,
  timeoutMs: number,
): Promise<ServiceWorkerRegistration | undefined> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      swContainer.ready,
      new Promise<undefined>((resolve) => {
        timer = setTimeout(() => resolve(undefined), timeoutMs)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

// A read that NEVER prompts. The waiting screen calls this on mount, and a permission prompt on
// load is iOS-hostile and trains people to deny. False is the answer to every uncertainty here,
// which is also what the caller assumed before asking.
export const isSubscribedToPush = async (
  swContainer: ServiceWorkerContainer | undefined = resolveContainer(),
  readyTimeoutMs = READY_TIMEOUT_MS,
): Promise<boolean> => {
  if (!swContainer) {
    return false
  }
  const registration = await waitForWorker(swContainer, readyTimeoutMs)
  if (!registration) {
    return false
  }
  return (await registration.pushManager.getSubscription()) !== null
}

export const subscribeToPush = async (
  sessionId: string,
  userId: string,
  swContainer: ServiceWorkerContainer | undefined = resolveContainer(),
  readyTimeoutMs = READY_TIMEOUT_MS,
): Promise<PushResult> => {
  if (!swContainer || typeof Notification === 'undefined') {
    return 'unsupported'
  }
  // Permission FIRST, and from the tap that called this: Safari and Firefox both require user
  // activation, and a multi-second wait for the worker beforehand would spend it.
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return 'denied'
  }
  // Before the VAPID fetch, so a browser that can never subscribe does not spend a request on a
  // key it cannot use.
  const registration = await waitForWorker(swContainer, readyTimeoutMs)
  if (!registration) {
    return 'unready'
  }
  const { publicKey } = await fetchVapidPublicKey()
  const subscription = await registration.pushManager.subscribe({
    applicationServerKey: urlBase64ToUint8Array(publicKey),
    userVisibleOnly: true,
  })
  await postPushSubscription(sessionId, userId, subscription.toJSON())
  return 'subscribed'
}

// Browser first, server second — so a failed server call still leaves the browser unsubscribed
// rather than the reverse. A stale server record is harmless: it dies with the session TTL, and
// pushing to an unsubscribed endpoint returns 410, which the send path prunes.
export const unsubscribeFromPush = async (
  sessionId: string,
  userId: string,
  swContainer: ServiceWorkerContainer | undefined = resolveContainer(),
  readyTimeoutMs = READY_TIMEOUT_MS,
): Promise<void> => {
  if (!swContainer) {
    return
  }
  const registration = await waitForWorker(swContainer, readyTimeoutMs)
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) {
    return
  }
  const { endpoint } = subscription
  await subscription.unsubscribe()
  try {
    await deletePushSubscription(sessionId, userId, endpoint)
  } catch {
    // Already unsubscribed locally, which is what the user asked for.
  }
}
