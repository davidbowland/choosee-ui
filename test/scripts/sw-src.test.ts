import fs from 'fs'
import path from 'path'
import vm from 'vm'

interface Notification {
  body: string
  title: string
}

interface SwExports {
  buildNotification: (payload: Record<string, unknown>) => Notification
  targetPathFor: (payload: Record<string, unknown>) => string
}

// The worker is plain JS meant for a ServiceWorkerGlobalScope, so it is evaluated in a VM with a
// stub `self` rather than imported. Only the pure helpers it hangs off `self.__swTestExports` are
// exercised here; the event wiring is integration territory.
const loadWorker = (): SwExports => {
  const source = fs.readFileSync(path.join(__dirname, '../../scripts/sw-src.js'), 'utf8')
  const self: Record<string, any> = {
    addEventListener: () => undefined,
    caches: { open: () => Promise.resolve({ match: () => Promise.resolve(undefined) }) },
    clients: { claim: () => Promise.resolve(), matchAll: () => Promise.resolve([]) },
    location: { origin: 'https://choosee.dbowland.com' },
    registration: { showNotification: () => Promise.resolve() },
    skipWaiting: () => undefined,
  }
  vm.createContext(self)
  self.self = self
  vm.runInContext(source, self)
  return self.__swTestExports as SwExports
}

describe('sw-src', () => {
  const { buildNotification, targetPathFor } = loadWorker()

  describe('buildNotification', () => {
    it('should announce a round with its position in the bracket', () => {
      expect(
        buildNotification({ round: 3, sessionId: 'fuzzy-penguin', totalRounds: 4, userId: 'brave-tiger' }),
      ).toEqual({ body: 'Tap to vote.', title: 'Round 3 of 4 is open' })
    })

    // `typeof 0 === 'number'`, so a naive guard renders "Round 2 of 0 is open" whenever a caller
    // omits totalRounds — and the API's default for it is 0.
    it('should drop the bracket length rather than announce a round of zero', () => {
      expect(
        buildNotification({ round: 2, sessionId: 'fuzzy-penguin', totalRounds: 0, userId: 'brave-tiger' }),
      ).toEqual({ body: 'Tap to vote.', title: 'Round 2 is open' })
    })

    it('should drop the bracket length when it is missing entirely', () => {
      expect(buildNotification({ round: 2, sessionId: 'fuzzy-penguin', userId: 'brave-tiger' })).toEqual({
        body: 'Tap to vote.',
        title: 'Round 2 is open',
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
