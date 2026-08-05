const STORAGE_KEY = 'choosee.joined'
const RECORD_VERSION = 1
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

/** The home page's view: live, unflagged, newest first, capped. */
export const readJoinedSessions = (now = Date.now): JoinedSession[] => {
  const at = now()
  return readAll()
    .filter((session) => isLive(session, at) && !session.winnerSeen && !session.dismissed)
    .sort((a, b) => b.joinedAt - a.joinedAt)
    .slice(0, DISPLAY_LIMIT)
}

/**
 * The session page's identity lookup. Deliberately ignores `dismissed` and `winnerSeen`: those flags
 * hide a card, they do not revoke who you are. Filtering on them here would drop a returning voter
 * onto the name picker for the crime of tidying their home page.
 */
export const findJoinedSession = (sessionId: string, now = Date.now): JoinedSession | undefined => {
  const at = now()
  return readAll().find((session) => session.sessionId === sessionId && isLive(session, at))
}

export const rememberSession = (entry: Omit<JoinedSession, 'joinedAt'>, now = Date.now): void => {
  const all = readAll()
  const previous = all.find((session) => session.sessionId === entry.sessionId)
  // Spreading `previous` first preserves its flags and its original joinedAt: rejoining must not
  // resurrect a dismissed card, nor extend a TTL past the Choosee's real 24-hour expiry.
  const merged: JoinedSession = { ...previous, ...entry, joinedAt: previous?.joinedAt ?? now() }
  writeAll([merged, ...all.filter((session) => session.sessionId !== entry.sessionId)])
}

const flag = (sessionId: string, key: 'dismissed' | 'winnerSeen'): void => {
  writeAll(readAll().map((session) => (session.sessionId === sessionId ? { ...session, [key]: true } : session)))
}

export const dismissSession = (sessionId: string): void => flag(sessionId, 'dismissed')

export const markWinnerSeen = (sessionId: string): void => flag(sessionId, 'winnerSeen')

/** Genuine deletion. For a Choosee the server says is gone. */
export const forgetSession = (sessionId: string): void => {
  writeAll(readAll().filter((session) => session.sessionId !== sessionId))
}
