import { useQuery } from '@tanstack/react-query'
import React, { useCallback, useEffect, useState } from 'react'

import { ListHeading, ResumeCard } from './elements'
import { deriveCardState } from './helpers'
import { fetchChoices, fetchSession, fetchUsers, hasStatusCode } from '@services/api'
import { ChoicesMap, SessionData, User } from '@types'
import { JoinedSession, dismissSession, forgetSession, readJoinedSessions } from '@utils/joined-sessions'

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
  const { data: users, error: usersError } = useQuery<User[]>({
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

  // 404 is authoritative: Choosees expire after 24 hours and the server forgets them. Any other
  // failure is a blip, and a blip is not a reason to delete somebody's card.
  const isGone = hasStatusCode(sessionError, 404) || hasStatusCode(usersError, 404)
  useEffect(() => {
    if (isGone) onGone(sessionId)
  }, [isGone, onGone, sessionId])

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
