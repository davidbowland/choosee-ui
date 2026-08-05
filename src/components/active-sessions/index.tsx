import { useQuery } from '@tanstack/react-query'
import React, { useCallback, useEffect, useState } from 'react'

import { ListHeading, ResumeCard } from './elements'
import { deriveCardState } from './helpers'
import { fetchChoices, fetchSession, fetchUsers, hasStatusCode } from '@services/api'
import { ChoicesMap, SessionData, User } from '@types'
import {
  JoinedSession,
  dismissSession,
  forgetSession,
  readJoinedSessions,
  rememberSession,
} from '@utils/joined-sessions'

interface CardProps {
  entry: JoinedSession
  onDismiss: (sessionId: string) => void
  onGone: (sessionId: string) => void
}

const Card = ({ entry, onDismiss, onGone }: CardProps): React.ReactNode => {
  const { sessionId } = entry

  // The session page's exact query keys, so tapping a card lands on a warm cache.
  const { data: session, error: sessionError } = useQuery<SessionData>({
    queryFn: () => fetchSession(sessionId),
    queryKey: ['session', sessionId],
  })

  // Gated on isReady, matching the session page. A record is only ever written on join, and joining
  // requires a ready session, so a remembered Choosee was ready when it was remembered. Ungating
  // would render "Round 1 of 0 — 0 of 0 voted" off an empty bracket.
  const { data: users } = useQuery<User[]>({
    enabled: session?.isReady === true,
    queryFn: () => fetchUsers(sessionId),
    queryKey: ['users', sessionId],
  })

  // session.winner is a choiceId; only ChoicesMap knows the name. An in-progress Choosee never
  // fires this, so naming the winner costs nothing until there is one.
  const { data: choices } = useQuery<ChoicesMap>({
    enabled: session?.winner != null,
    queryFn: () => fetchChoices(sessionId),
    queryKey: ['choices', sessionId],
    staleTime: Infinity,
  })

  // A 404 on the SESSION is authoritative: Choosees expire after 24 hours and the server forgets
  // them. Any other failure is a blip, and a blip is not a reason to delete somebody's card.
  //
  // Deliberately not also keyed on the users query. onGone is the one genuine delete in the whole
  // module — everything else flags — and retry is off globally, so a single 404 from the secondary
  // endpoint for a reason unrelated to expiry (a deploy window, a gateway 404) would strip the
  // identity from every card on every device with this page open, with no undo. The next time those
  // people opened their link they would meet the name picker and vote as a second person, forking
  // their votes: exactly what the flag-don't-delete design exists to prevent. A live session's 404
  // covers real expiry on its own, and the users query cannot even fire unless the session loaded.
  const isGone = hasStatusCode(sessionError, 404)
  useEffect(() => {
    if (isGone) onGone(sessionId)
  }, [isGone, onGone, sessionId])

  // Refresh what the next first paint will read. The record is otherwise written only at join time,
  // so someone who joined at round 0 and comes back three rounds later would be shown "Round 1 of 5"
  // before it snapped to "Round 4 of 5" — a stale round is worse than no round. rememberSession
  // preserves joinedAt and any flags, so this cannot extend the TTL or resurrect a dismissed card.
  // Gated on isReady for the same reason the users query above is: a not-ready session has an empty
  // bracket, and caching its zeros would paint "Round 1 of 0" on the next first load.
  const { address, currentRound, isReady, totalRounds } = session ?? {}
  useEffect(() => {
    if (!isReady || address === undefined || currentRound === undefined || totalRounds === undefined) return
    rememberSession({ address, currentRound, sessionId, totalRounds, userId: entry.userId })
  }, [address, currentRound, isReady, totalRounds, sessionId, entry.userId])

  // The cached entry supplies the address and round for first paint. It does not stand in for a
  // SessionData — no session means loading, and deriveCardState says so itself.
  const state = deriveCardState({
    cached: { currentRound: entry.currentRound, totalRounds: entry.totalRounds },
    choices,
    session,
    userId: entry.userId,
    users,
  })

  return (
    <ResumeCard
      address={session?.address ?? entry.address}
      onDismiss={() => onDismiss(sessionId)}
      sessionId={sessionId}
      state={state}
    />
  )
}

/**
 * Choosees this device joined and has not finished. Nothing renders when there are none: a
 * first-time visitor sees the home page exactly as it was before this existed.
 */
const ActiveSessions = (): React.ReactNode => {
  const [entries, setEntries] = useState<JoinedSession[]>([])

  // After mount, never during render. This page is statically prerendered, so reading storage in
  // render would produce client markup the build never generated.
  useEffect(() => {
    setEntries(readJoinedSessions())
  }, [])

  const drop = useCallback((sessionId: string) => {
    setEntries((current) => current.filter((entry) => entry.sessionId !== sessionId))
  }, [])

  const handleDismiss = useCallback(
    (sessionId: string) => {
      dismissSession(sessionId)
      drop(sessionId)
    },
    [drop],
  )

  const handleGone = useCallback(
    (sessionId: string) => {
      forgetSession(sessionId)
      drop(sessionId)
    },
    [drop],
  )

  if (entries.length === 0) return null

  return (
    <section aria-label="Choosees in progress" className="mb-4 flex flex-col gap-2.5">
      <ListHeading />
      {entries.map((entry) => (
        <Card entry={entry} key={entry.sessionId} onDismiss={handleDismiss} onGone={handleGone} />
      ))}
    </section>
  )
}

export default ActiveSessions
