import { useEffect } from 'react'

import { postPushSubscription } from '@services/api'

/* istanbul ignore next -- SSR guard */
const resolveContainer = (): ServiceWorkerContainer | undefined =>
  typeof navigator === 'undefined' ? undefined : navigator.serviceWorker

// A browser can rotate a push subscription at any time. The worker re-subscribes and posts the new
// one here, because only the page knows which session and user it belongs to. Without this the
// device silently stops receiving pushes while the UI still says "We'll notify you!".
export const usePushResubscribe = (
  sessionId: string,
  userId: string | undefined,
  swContainer: ServiceWorkerContainer | undefined = resolveContainer(),
): void => {
  useEffect(() => {
    if (!swContainer || !userId) {
      return undefined
    }
    const onMessage = (event: MessageEvent): void => {
      if (event.data?.type !== 'push-resubscribed' || !event.data?.subscription) {
        return
      }
      // Fire and forget: a failed re-registration is recovered on the next visit, and there is no
      // UI affordance to report it against.
      void postPushSubscription(sessionId, userId, event.data.subscription).catch(() => undefined)
    }
    swContainer.addEventListener('message', onMessage)
    return () => swContainer.removeEventListener('message', onMessage)
  }, [sessionId, userId, swContainer])
}
