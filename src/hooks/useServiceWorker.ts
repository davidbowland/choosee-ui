import { useEffect } from 'react'

/* istanbul ignore next -- SSR guard: `navigator` is always defined under jsdom */
const resolveContainer = (): ServiceWorkerContainer | undefined =>
  typeof navigator === 'undefined' ? undefined : navigator.serviceWorker

// The worker calls skipWaiting, so a new build can take control of a page the previous build
// rendered. That page holds its route chunks by content hash, and the deploy has already removed
// them from the origin — so the first not-yet-loaded route would 404. Reloading retires those URLs
// along with the page holding them.
//
// Only when a worker was ALREADY in control. clients.claim() fires controllerchange on a first
// registration too, but nothing on screen came from a worker then, so there is no stale URL to
// escape — reloading there would discard a page that had just finished loading, for nothing.
const reloadOnTakeover = (swContainer: ServiceWorkerContainer, reload: () => void): void => {
  if (!swContainer.controller) {
    return
  }
  let reloaded = false
  swContainer.addEventListener('controllerchange', () => {
    // Chrome can fire this more than once; a second reload would interrupt the first one landing.
    if (reloaded) {
      return
    }
    reloaded = true
    reload()
  })
}

/* istanbul ignore next -- the real page reload cannot run inside jsdom */
const reloadWindow = (): void => window.location.reload()

export const registerServiceWorker = async (
  swContainer: ServiceWorkerContainer | undefined = resolveContainer(),
  scriptUrl = '/sw.js',
  isProduction = process.env.NODE_ENV === 'production',
  reload: () => void = reloadWindow,
): Promise<ServiceWorkerRegistration | undefined> => {
  // Only production registers. Under `next dev` the /_next/static/* URLs are stable paths rewritten
  // in place rather than content-hashed, so a cached worker would keep serving a stale chunk after
  // every edit — and the only escape would be unregistering by hand in DevTools.
  if (!swContainer || !isProduction) {
    return undefined
  }
  // Subscribed before register(), not after: a worker can install and claim while that promise is
  // still settling, and a listener added afterwards would miss the takeover it exists to catch.
  reloadOnTakeover(swContainer, reload)
  try {
    return await swContainer.register(scriptUrl)
  } catch {
    // A failed registration must not break the app. Push simply stays unavailable, and
    // resolvePushCapability reports `unready` rather than claiming the browser cannot do it.
    return undefined
  }
}

// `isProduction` is injectable for the same reason it is on registerServiceWorker: without it the
// hook's own call is unreachable under jsdom, and a test asserting "does not register outside
// production" passes even with the guard deleted.
export const useServiceWorker = (isProduction = process.env.NODE_ENV === 'production'): void => {
  useEffect(() => {
    registerServiceWorker(undefined, '/sw.js', isProduction)
  }, [isProduction])
}
