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
