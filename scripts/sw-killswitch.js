/*
 * Emergency service worker kill switch.
 *
 *   cp scripts/sw-killswitch.js scripts/sw-src.js
 *   git commit -am "Kill the service worker" && git push origin master
 *
 * It must go through the pipeline. `npm run deploy` builds and syncs the TEST stack
 * (scripts/deploy.sh deploys choosee-ui-test and copies to the choosee-ui-test bucket), so running
 * it during a production incident changes nothing on choosee.dbowland.com. Only the master pipeline
 * touches production, and only it passes the CloudFront distribution ID to copyToS3.sh — which is
 * what invalidates /sw.js so browsers actually pick this up.
 *
 * Deletes every cache and handles no fetches, so the site behaves as a plain static site again.
 * Restore with `git checkout -- scripts/sw-src.js` once the real fix is ready.
 *
 * WHAT THIS DELIBERATELY KEEPS: the push and notificationclick handlers, byte for byte. Web Push
 * only works through a registered worker, so a kill switch that unregistered itself would end
 * notification delivery for everyone, silently, with nothing in the UI to say so. Losing the
 * offline page is an acceptable incident cost; losing notifications is not.
 */

// Declared here rather than beside its reader below, because deleteAllCaches needs it.
const CONTEXT_CACHE = 'choosee-push-context'

const deleteAllCaches = async () => {
  try {
    const keys = await caches.keys()
    // Everything EXCEPT the push context. This worker exists to disable caching without disabling
    // notifications, and that entry is what lets pushsubscriptionchange re-register a rotated
    // subscription with no page open. Deleting it would silently end delivery for any device the
    // browser rotates during the incident — precisely the failure this file is written to avoid.
    await Promise.all(keys.filter((key) => key !== CONTEXT_CACHE).map((key) => caches.delete(key)))
  } catch {
    // No storage, or site data is blocked. There is nothing left to clear either way.
  }
}

// Nothing is precached and no fetch handler is registered, so every request goes straight to the
// network exactly as it would with no worker installed. The offline page goes with it.
self.addEventListener('install', (event) => {
  event.waitUntil(deleteAllCaches())
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Repeated on activate as well as install: a client still controlled by the previous worker
      // keeps that worker's caches reachable until this one takes over.
      await deleteAllCaches()
      await self.clients.claim()
    })(),
  )
})

// The payload carries FACTS — which round, of how many, or which restaurant won. The sentence is
// assembled here because copy belongs to this repo: a Lambda shipping finished English would mean
// an API deploy to fix a typo.
const buildNotification = (payload) => {
  if (payload && typeof payload.winnerName === 'string' && payload.winnerName.length > 0) {
    return { body: "Tap to see where you're eating.", title: `${payload.winnerName} wins` }
  }
  if (payload && typeof payload.round === 'number') {
    // "of N" only when N is a real bracket length. `typeof 0 === 'number'` passes a naive guard, so
    // a caller that omits totalRounds — and the API's default for it is 0 — would otherwise render
    // "Round 2 of 0 is open". Dropping the clause degrades to a sentence that is merely less
    // informative rather than one that is visibly broken.
    const total = typeof payload.totalRounds === 'number' && payload.totalRounds > 0 ? payload.totalRounds : null
    return {
      body: 'Tap to vote.',
      title: total ? `Round ${payload.round} of ${total} is open` : `Round ${payload.round} is open`,
    }
  }
  // A malformed or unreadable payload lands here. iOS revokes the push permission of a worker that
  // receives a push without showing a notification, so there must always be something to draw.
  return { body: 'Something happened in your Choosee.', title: 'Choosee' }
}

// The route is built HERE, from ids the API sent. The API shipping a ready-made `/s/<id>/` would
// put a Next.js route string in a Lambda, where renaming the route in this repo would silently
// strip every notification of its destination until the other repo shipped.
const targetPathFor = (payload) => {
  if (!payload || typeof payload.sessionId !== 'string' || payload.sessionId.length === 0) {
    return '/'
  }
  // encodeURIComponent, not encodeURI: each id is one path segment, and a stray slash would
  // otherwise open some other route entirely. The trailing slash matches next.config's
  // trailingSlash, so the path the worker opens is the path the app navigates to.
  const base = `/s/${encodeURIComponent(payload.sessionId)}/`
  return typeof payload.userId === 'string' && payload.userId.length > 0
    ? `${base}?id=${encodeURIComponent(payload.userId)}`
    : base
}

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = {}
  }

  const notification = buildNotification(payload)
  const tag = typeof payload.sessionId === 'string' ? payload.sessionId : ''

  event.waitUntil(
    self.registration.showNotification(notification.title, {
      badge: '/icon-192.png',
      body: notification.body,
      data: { sessionId: payload.sessionId, userId: payload.userId },
      icon: '/icon-192.png',
      // One live notification per Choosee, so two concurrent sessions stack rather than replacing
      // each other. `renotify` is conditional on the tag and that is not caution: the Notifications
      // Standard throws a TypeError when `renotify` is true and `tag` is the empty string, which
      // rejects showNotification and draws NOTHING — and Chrome answers a push that displayed
      // nothing with its own "site updated in the background" banner, then eventually drops the
      // subscription. The one payload we cannot read would be the one push that shows nothing.
      renotify: Boolean(tag),
      tag,
    }),
  )
})

const normalizePath = (url) => {
  try {
    return new URL(url, self.location.origin).pathname.replace(/\/+$/, '') || '/'
  } catch {
    return ''
  }
}

const openTarget = async (targetUrl) => {
  const targetPath = normalizePath(targetUrl)
  let clientList = []
  try {
    clientList = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
  } catch {
    // No window list; fall through and open one.
  }
  const focusable = clientList.filter((client) => 'focus' in client)

  // Already on this session: focus and stop. The session polls on its own, so the round arrives
  // without a reload — and reloading would throw away whatever the person was mid-way through.
  const open = focusable.find((client) => normalizePath(client.url) === targetPath)
  if (open) {
    return open.focus()
  }

  const [client] = focusable
  if (client) {
    try {
      // Awaited, not fired and forgotten: navigate() rejects for a client this worker does not
      // control — and includeUncontrolled hands us exactly those — which would leave an unhandled
      // rejection while focus() ran anyway, bringing the app forward on the wrong screen.
      const navigated = await client.navigate(targetUrl)
      return await (navigated || client).focus()
    } catch {
      // Could not be steered; open a window that starts out in the right place.
    }
  }

  return self.clients.openWindow ? self.clients.openWindow(targetUrl) : undefined
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(openTarget(targetPathFor(event.notification.data || {})))
})

// A browser may rotate a subscription at any time. Without this the device goes quiet with nothing
// in the UI to say so — the app still believes it is subscribed, because getSubscription() returns
// the new one.
// Where the page leaves what this worker needs to re-register a rotated subscription on its own.
//
// The Cache API is used as a tiny key-value store because it is the only storage a service worker
// can reach synchronously enough here without pulling in IndexedDB. The entry holds no secret: a
// session slug, a user id, the VAPID PUBLIC key, and the API origin.
const CONTEXT_KEY = '/__push-context__'

const readPushContext = async () => {
  try {
    const cache = await caches.open(CONTEXT_CACHE)
    const stored = await cache.match(CONTEXT_KEY)
    return stored ? await stored.json() : null
  } catch {
    return null
  }
}

/*
 * Re-register a subscription the browser rotated under us.
 *
 * Two things make the obvious implementation not work:
 *
 *  - This event fires overwhelmingly when NO page is open — that is the whole point of it. Relaying
 *    the new subscription to `clients.matchAll()` and stopping there therefore does nothing in the
 *    common case, and the device goes quiet while the UI still reads "We'll notify you!".
 *  - Firefox fires it with no `oldSubscription`, and `getSubscription()` has already returned null
 *    by then — so reading `applicationServerKey` off the old subscription yields undefined and the
 *    re-subscribe cannot even be attempted.
 *
 * Both are solved by the page having written the key and the session context down at subscribe
 * time. The relay to open windows is kept as well, since a live page can update its own UI.
 */
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const context = await readPushContext()
        const old = event.oldSubscription || (await self.registration.pushManager.getSubscription())
        const applicationServerKey =
          (old && old.options && old.options.applicationServerKey) || (context && context.applicationServerKey)
        if (!applicationServerKey) {
          return
        }
        const fresh = await self.registration.pushManager.subscribe({
          applicationServerKey,
          userVisibleOnly: true,
        })

        // Re-register without needing a page. Everything required is in the stored context.
        if (context && context.apiUrl && context.sessionId && context.userId) {
          await fetch(
            `${context.apiUrl}/sessions/${encodeURIComponent(context.sessionId)}/users/${encodeURIComponent(
              context.userId,
            )}/push-subscription`,
            {
              body: JSON.stringify(fresh.toJSON()),
              headers: { 'content-type': 'application/json' },
              method: 'POST',
            },
          )
        }

        // A page that happens to be open updates its own state from this rather than waiting for a
        // reload.
        const windows = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
        windows.forEach((client) => client.postMessage({ subscription: fresh.toJSON(), type: 'push-resubscribed' }))
      } catch {
        // Nothing more this worker can do. The next visit to a session re-subscribes.
      }
    })(),
  )
})

// Test seam. `self.__swTestExports` is read by test/scripts/sw-src.test.ts, which evaluates this
// file in a VM; it is inert in a real ServiceWorkerGlobalScope.
self.__swTestExports = { buildNotification, targetPathFor }
