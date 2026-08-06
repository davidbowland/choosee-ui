const RECORD_VERSION = 1

// The version lives in the KEY, not only in the envelope, so two versions of this app can never
// contend for one record. A field inside a document cannot protect that document from being
// replaced: an earlier attempt kept a single key and had readAll bail on an unrecognised version
// while writeAll refused to overwrite one — which deadlocked. A device that ran a later version and
// then got rolled back could neither read its record nor replace it, so findJoinedSession returned
// undefined forever, every visit to every Choosee met the name picker, and nothing in the app could
// clear it. Namespacing makes that unreachable: each version owns its own key, a rollback finds its
// own data intact, and a future version can read the previous key to migrate and then delete it.
const STORAGE_KEY = `choosee.joined.v${RECORD_VERSION}`
const TTL_MS = 24 * 60 * 60 * 1000

// What the home page shows, versus what the record holds. The display cap keeps the create form —
// the page's actual job — from being pushed down. The storage cap is a ceiling on a list that
// retains flagged entries so identities survive dismissal.
const DISPLAY_LIMIT = 3
const STORAGE_LIMIT = 20

export interface JoinedSession {
  sessionId: string
  userId: string
  address: string
  /** 0-based, as the API reports it. Displayed as `currentRound + 1`. */
  currentRound: number
  totalRounds: number
  joinedAt: number
  /** Set once the winner phase has rendered for this Choosee. Hides the card; keeps the identity. */
  winnerSeen?: true
  /** Set by the dismiss control. Hides the card; keeps the identity. */
  dismissed?: true
}

interface JoinedSessionsRecord {
  version: number
  sessions: JoinedSession[]
}

const isJoinedSession = (value: unknown): value is JoinedSession => {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.sessionId === 'string' &&
    typeof candidate.userId === 'string' &&
    typeof candidate.address === 'string' &&
    typeof candidate.currentRound === 'number' &&
    typeof candidate.totalRounds === 'number' &&
    typeof candidate.joinedAt === 'number'
  )
}

// Storage is absent during the static export build and can be refused outright by Safari private
// browsing or a "block all cookies" setting. Same posture as writePushContext in services/push.ts:
// the feature disappears, the page does not break.
const readAll = (): JoinedSession[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as JoinedSessionsRecord
    if (parsed?.version !== RECORD_VERSION || !Array.isArray(parsed.sessions)) return []
    return parsed.sessions.filter(isJoinedSession)
  } catch {
    return []
  }
}

const writeAll = (sessions: JoinedSession[]): void => {
  try {
    const record: JoinedSessionsRecord = { sessions: sessions.slice(0, STORAGE_LIMIT), version: RECORD_VERSION }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
  } catch {
    // Nothing to do and nothing to tell the user: they did not ask for this.
  }
}

const isLive = (session: JoinedSession, at: number): boolean => at - session.joinedAt < TTL_MS

/**
 * Everything still inside the TTL. Every reader and every mutator goes through this, so an expired
 * entry is not merely hidden — it stops being carried forward the next time anything writes.
 *
 * That distinction is the whole point. A TTL that only filtered what is displayed would leave an
 * address the user typed, or that came from their coordinates, in origin-wide storage indefinitely,
 * while the privacy policy tells them it clears itself after a day.
 */
const readLive = (at: number): JoinedSession[] => readAll().filter((session) => isLive(session, at))

/** The home page's view: live, unflagged, newest first, capped. */
export const readJoinedSessions = (now = Date.now): JoinedSession[] => {
  const at = now()
  const all = readAll()
  const live = all.filter((session) => isLive(session, at))

  // On a device that has stopped joining Choosees, a read is the only event still guaranteed to
  // happen, so it has to be what does the deleting. Writing only when something actually expired
  // keeps the ordinary load read-only.
  if (live.length !== all.length) writeAll(live)

  return live
    .filter((session) => !session.winnerSeen && !session.dismissed)
    .sort((a, b) => b.joinedAt - a.joinedAt)
    .slice(0, DISPLAY_LIMIT)
}

/**
 * The session page's identity lookup. Deliberately ignores `dismissed` and `winnerSeen`: those flags
 * hide a card, they do not revoke who you are. Filtering on them here would drop a returning voter
 * onto the name picker for the crime of tidying their home page.
 */
export const findJoinedSession = (sessionId: string, now = Date.now): JoinedSession | undefined =>
  readLive(now()).find((session) => session.sessionId === sessionId)

export const rememberSession = (entry: Omit<JoinedSession, 'joinedAt'>, now = Date.now): void => {
  const at = now()
  const all = readLive(at)
  const previous = all.find((session) => session.sessionId === entry.sessionId)
  // Spreading `previous` first preserves its flags and its original joinedAt: rejoining must not
  // resurrect a dismissed card, nor extend a TTL past the Choosee's real 24-hour expiry.
  const merged: JoinedSession = { ...previous, ...entry, joinedAt: previous?.joinedAt ?? at }
  writeAll([merged, ...all.filter((session) => session.sessionId !== entry.sessionId)])
}

const flag = (sessionId: string, key: 'dismissed' | 'winnerSeen', at: number): void => {
  const all = readLive(at)
  // Joining is the only thing that creates storage. Without this, someone who opens a shared link to
  // an already-finished Choosee lands on the winner screen, markWinnerSeen fires, and they get a
  // storage entry written for a Choosee they never joined.
  if (!all.some((session) => session.sessionId === sessionId)) return
  writeAll(all.map((session) => (session.sessionId === sessionId ? { ...session, [key]: true } : session)))
}

export const dismissSession = (sessionId: string, now = Date.now): void => flag(sessionId, 'dismissed', now())

export const markWinnerSeen = (sessionId: string, now = Date.now): void => flag(sessionId, 'winnerSeen', now())

/** Genuine deletion. For a Choosee the server says is gone. */
export const forgetSession = (sessionId: string, now = Date.now): void => {
  writeAll(readLive(now()).filter((session) => session.sessionId !== sessionId))
}
