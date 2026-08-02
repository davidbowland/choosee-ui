import fs from 'fs'
import path from 'path'
import vm from 'vm'

interface Notification {
  body: string
  title: string
}

interface SwExports {
  buildNotification: (payload: Record<string, unknown>) => Notification
  openTarget: (targetUrl: string, sessionId?: string) => Promise<unknown>
  targetPathFor: (payload: Record<string, unknown>) => string
}

// The worker is plain JS meant for a ServiceWorkerGlobalScope, so it is evaluated in a VM with a
// stub `self` rather than imported. Only the helpers it hangs off `self.__swTestExports` are
// exercised here; the event wiring is integration territory.
const loadWorker = (clients: Record<string, any> = {}): SwExports => {
  const source = fs.readFileSync(path.join(__dirname, '../../scripts/sw-src.js'), 'utf8')
  const self: Record<string, any> = {
    addEventListener: () => undefined,
    caches: { open: () => Promise.resolve({ match: () => Promise.resolve(undefined) }) },
    clients: { claim: () => Promise.resolve(), matchAll: () => Promise.resolve([]), ...clients },
    location: { origin: 'https://choosee.dbowland.com' },
    registration: { showNotification: () => Promise.resolve() },
    skipWaiting: () => undefined,
    // `URL` is a Node global, not an ECMAScript intrinsic, so a bare VM context does not have it.
    // Without this every `new URL` in normalizePath throws, both sides of its comparison collapse to
    // '', and EVERY client looks like it is already on the target session — which silently turns the
    // navigate and openWindow branches into dead code no test can reach.
    URL,
  }
  vm.createContext(self)
  self.self = self
  vm.runInContext(source, self)
  return self.__swTestExports as SwExports
}

describe('sw-src', () => {
  const { buildNotification, targetPathFor } = loadWorker()

  describe('buildNotification', () => {
    // `round` is the API's round INDEX — session.currentRound starts at 0 — so index 2 is the third
    // round. Announcing the raw index named a round people had already voted in.
    it('should announce a round by its human number, not its index', () => {
      expect(
        buildNotification({ round: 2, sessionId: 'fuzzy-penguin', totalRounds: 4, userId: 'brave-tiger' }),
      ).toEqual({ body: 'Tap to vote.', title: 'Round 3 of 4 is open' })
    })

    // The reported bug exactly: the second round of five announced itself as "Round 1 of 5".
    it('should call the first advance round two, not round one', () => {
      expect(
        buildNotification({ round: 1, sessionId: 'fuzzy-penguin', totalRounds: 5, userId: 'brave-tiger' }),
      ).toEqual({ body: 'Tap to vote.', title: 'Round 2 of 5 is open' })
    })

    // The final round is index totalRounds - 1, so the one-based number must land exactly on the
    // bracket length rather than overshooting it.
    it('should not announce a round beyond the bracket length', () => {
      expect(
        buildNotification({ round: 3, sessionId: 'fuzzy-penguin', totalRounds: 4, userId: 'brave-tiger' }),
      ).toEqual({ body: 'Tap to vote.', title: 'Round 4 of 4 is open' })
    })

    // `typeof 0 === 'number'`, so a naive guard renders "Round 3 of 0 is open" whenever a caller
    // omits totalRounds — and the API's default for it is 0.
    it('should drop the bracket length rather than announce a round of zero', () => {
      expect(
        buildNotification({ round: 2, sessionId: 'fuzzy-penguin', totalRounds: 0, userId: 'brave-tiger' }),
      ).toEqual({ body: 'Tap to vote.', title: 'Round 3 is open' })
    })

    it('should drop the bracket length when it is missing entirely', () => {
      expect(buildNotification({ round: 2, sessionId: 'fuzzy-penguin', userId: 'brave-tiger' })).toEqual({
        body: 'Tap to vote.',
        title: 'Round 3 is open',
      })
    })

    it('should announce a winner by name', () => {
      expect(
        buildNotification({ sessionId: 'fuzzy-penguin', userId: 'brave-tiger', winnerName: "Kim's Diner" }),
      ).toEqual({ body: "Tap to see where you're eating.", title: "Kim's Diner wins" })
    })

    it('should prefer the winner over the round when a payload somehow carries both', () => {
      const notification = buildNotification({
        round: 4,
        sessionId: 'fuzzy-penguin',
        totalRounds: 4,
        userId: 'brave-tiger',
        winnerName: "Kim's Diner",
      })

      expect(notification.title).toEqual("Kim's Diner wins")
    })

    it('should fall back to a generic notification for an unreadable payload', () => {
      expect(buildNotification({})).toEqual({
        body: 'Something happened in your Choosee.',
        title: 'Choosee',
      })
    })
  })

  describe('targetPathFor', () => {
    it('should build the session path carrying the user identity', () => {
      expect(targetPathFor({ sessionId: 'fuzzy-penguin', userId: 'brave-tiger' })).toEqual(
        '/s/fuzzy-penguin/?id=brave-tiger',
      )
    })

    it('should encode ids that contain path separators', () => {
      expect(targetPathFor({ sessionId: 'a/b', userId: 'c d' })).toEqual('/s/a%2Fb/?id=c%20d')
    })

    it('should fall back to the home page without a session', () => {
      expect(targetPathFor({})).toEqual('/')
    })
  })

  // Tapping a notification for a session that is ALREADY open only focuses that window — nothing
  // navigates and nothing reloads. The page's own refetch-on-focus is off, so without a nudge from
  // here the round the notification just announced does not appear until the next poll, up to 15s
  // of staring at the previous round.
  describe('openTarget', () => {
    const windowClient = (url: string) => ({
      focus: jest.fn().mockResolvedValue('focused'),
      navigate: jest.fn().mockResolvedValue(undefined),
      postMessage: jest.fn(),
      url,
    })

    it('should tell a window already on the session to refresh, then focus it', async () => {
      const client = windowClient('https://choosee.dbowland.com/s/fuzzy-penguin/')
      const { openTarget } = loadWorker({ matchAll: () => Promise.resolve([client]) })

      const result = await openTarget('/s/fuzzy-penguin/?id=brave-tiger', 'fuzzy-penguin')

      expect(client.postMessage).toHaveBeenCalledWith({ sessionId: 'fuzzy-penguin', type: 'session-refresh' })
      expect(client.focus).toHaveBeenCalled()
      expect(client.navigate).not.toHaveBeenCalled()
      expect(result).toEqual('focused')
    })

    // A window that cannot be messaged is still a window the person expects to be brought forward.
    // Losing the immediate refresh costs a poll interval; losing the focus loses the tap entirely.
    it('should still focus a window whose postMessage throws', async () => {
      const client = windowClient('https://choosee.dbowland.com/s/fuzzy-penguin/')
      client.postMessage.mockImplementation(() => {
        throw new Error('client gone')
      })
      const { openTarget } = loadWorker({ matchAll: () => Promise.resolve([client]) })

      await openTarget('/s/fuzzy-penguin/?id=brave-tiger', 'fuzzy-penguin')

      expect(client.focus).toHaveBeenCalled()
    })

    // The refresh message is for the window that stays where it is. A window being steered somewhere
    // else reloads on arrival, and messaging it would ask a page about to be replaced to refetch.
    it('should navigate a window sitting on another session rather than messaging it', async () => {
      const client = windowClient('https://choosee.dbowland.com/s/other-session/')
      const { openTarget } = loadWorker({ matchAll: () => Promise.resolve([client]) })

      await openTarget('/s/fuzzy-penguin/?id=brave-tiger', 'fuzzy-penguin')

      expect(client.navigate).toHaveBeenCalledWith('/s/fuzzy-penguin/?id=brave-tiger')
      expect(client.postMessage).not.toHaveBeenCalled()
    })

    it('should open a window when none is available to steer', async () => {
      const openWindow = jest.fn().mockResolvedValue('opened')
      const { openTarget } = loadWorker({ matchAll: () => Promise.resolve([]), openWindow })

      await openTarget('/s/fuzzy-penguin/?id=brave-tiger', 'fuzzy-penguin')

      expect(openWindow).toHaveBeenCalledWith('/s/fuzzy-penguin/?id=brave-tiger')
    })
  })
})

// The kill switch exists to disable caching WITHOUT disabling notifications, so its push handlers
// must stay identical to the real worker's. Nothing enforced that — it was verified by hand once
// and would drift silently on the next edit to either file.
describe('sw-killswitch', () => {
  const sliceFrom = (file: string, marker: string): string => {
    const source = fs.readFileSync(path.join(__dirname, '../../scripts', file), 'utf8')
    const index = source.indexOf(marker)
    expect(index).toBeGreaterThan(-1)
    return source.slice(index)
  }

  const MARKER = '// The payload carries FACTS'

  it('should share its notification handlers with the real worker byte for byte', () => {
    expect(sliceFrom('sw-killswitch.js', MARKER)).toEqual(sliceFrom('sw-src.js', MARKER))
  })

  it('should register no fetch handler, so nothing is cached', () => {
    const source = fs.readFileSync(path.join(__dirname, '../../scripts/sw-killswitch.js'), 'utf8')

    expect(source).not.toContain("addEventListener('fetch'")
  })
})
