const RECORD_VERSION = 1

// The version lives in the KEY, not only in the envelope, so two versions of this app can never
// contend for one record. A field inside a document cannot protect that document from being
// replaced: an earlier attempt kept a single key and had readAll bail on an unrecognized version
// while writeAll refused to overwrite one — which deadlocked. A device that ran a later version and
// then got rolled back could neither read its record nor replace it, so findJoinedSession returned
// undefined forever, every visit to every Choosee met the name picker, and nothing in the app could
// clear it. Namespacing makes that unreachable: each version owns its own key, a rollback finds its
// own data intact, and a future version can read the previous key to migrate and then delete it.
const STORAGE_KEY = `choosee.joined.v${RECORD_VERSION}`

/**
 * When the last displayable Choosee expires, or absent when there are none.
 *
 * Exists so `_document`'s inline script can pick the home page's layout before first paint without
 * parsing the record or duplicating a single predicate. One number, written by the functions that
 * already own the list, and self-expiring: a value in the past means the same as no value at all.
 *
 * Derived from STORAGE_KEY so the version namespacing carries over — two app versions must no more
 * contend for the hint than for the record it summarizes.
 */
export const HINT_KEY = `${STORAGE_KEY}.until`

/** How long a Choosee lives. Exported so the card can say how much of it is left. */
export const TTL_MS = 24 * 60 * 60 * 1000

// What the home page shows, versus what the record holds. The display cap keeps the create form —
// the page's actual job — from being pushed down. The storage cap is a ceiling on a list that
// retains flagged entries so identities survive dismissal.
//
// The display cap is applied by ActiveSessions rather than here: it owns the control that reveals
// what the cap hides, and it cannot offer that without being handed the entries the cap dropped.
export const DISPLAY_LIMIT = 3
const STORAGE_LIMIT = 20

export interface JoinedSession {
  sessionId: string
  userId: string
  address: string
  /** 0-based, as the API reports it. Displayed as `currentRound + 1`. */
  currentRound: number
  totalRounds: number
  joinedAt: number
  /**
   * The other voters, as they have named themselves. Optional, and deliberately not part of the
   * record version: a record written before this existed is still a valid record, and the card
   * falls back to the address for the one paint it takes for the voter list to arrive.
   *
   * Excludes this device's own voter — the line reads as who you are deciding *with*.
   */
  names?: string[]
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
    typeof candidate.joinedAt === 'number' &&
    // Absent is valid — it is what every record written before names existed looks like. Present
    // and malformed is not: the card maps over it.
    (candidate.names === undefined ||
      (Array.isArray(candidate.names) && candidate.names.every((name) => typeof name === 'string')))
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

/** The home page's predicate, named once so the hint and the list can never drift apart. */
const isDisplayable = (session: JoinedSession): boolean => !session.winnerSeen && !session.dismissed

/**
 * Keeps HINT_KEY in step with the list. Writes only on a genuine change, so the ordinary load stays
 * read-only — and so a device holding records written before this key existed heals on its next
 * visit rather than on its next join.
 */
const syncHint = (sessions: JoinedSession[]): void => {
  try {
    const until = sessions
      .filter(isDisplayable)
      .reduce((latest, session) => Math.max(latest, session.joinedAt + TTL_MS), 0)
    const next = until > 0 ? String(until) : null
    if (localStorage.getItem(HINT_KEY) === next) return
    if (next === null) {
      localStorage.removeItem(HINT_KEY)
      return
    }
    localStorage.setItem(HINT_KEY, next)
  } catch {
    // Same posture as writeAll: the feature disappears, the page does not break.
  }
}

const writeAll = (sessions: JoinedSession[]): void => {
  // Computed against what was actually stored, not what was offered. An entry the ceiling drops
  // cannot display, so it must not be what the hint promises.
  const stored = sessions.slice(0, STORAGE_LIMIT)
  try {
    const record: JoinedSessionsRecord = { sessions: stored, version: RECORD_VERSION }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
    // Inside the try, after the record, so the hint can never describe a list that was not stored.
    // The record write is the large one and the hint is thirteen bytes, so under quota pressure the
    // record is what fails — and a hint promising a Choosee that is not on disk would paint the
    // resume layout for a device with nothing to resume. Skipped, the hint stays as stale as the
    // record it summarizes, which is the pair agreeing rather than disagreeing. syncHint swallows
    // its own failures, so it cannot be what lands in the catch below.
    syncHint(stored)
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

/** The home page's view: live, unflagged, newest first. Capping is the caller's job. */
export const readJoinedSessions = (now = Date.now): JoinedSession[] => {
  const at = now()
  const all = readAll()
  const live = all.filter((session) => isLive(session, at))

  // On a device that has stopped joining Choosees, a read is the only event still guaranteed to
  // happen, so it has to be what does the deleting. Writing only when something actually expired
  // keeps the ordinary load read-only.
  //
  // When nothing expired the record is already right, but the hint may not be — that is the case on
  // every device whose record was written before the hint existed. syncHint decides for itself
  // whether the difference is worth a write, so the common load still touches nothing.
  if (live.length === all.length) syncHint(live)
  else writeAll(live)

  return live.filter(isDisplayable).sort((a, b) => b.joinedAt - a.joinedAt)
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
