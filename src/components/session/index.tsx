import { useQuery, useQueryClient } from '@tanstack/react-query'
import React, { useEffect, useMemo, useRef } from 'react'

import { ClosingSoonErrorAlert, ErrorBanner } from './elements'
import { firstUnvotedIndex, sessionLoadErrorMessage } from './helpers'
import LoadingPhase from './loading'
import UserSelectPhase from './user-select'
import VotingPhase from './voting'
import WaitingPhase from './waiting'
import WinnerPhase from './winner'
import ErrorBoundary from '@components/error-boundary'
import { usePushResubscribe } from '@hooks/usePushResubscribe'
import { useSessionCookie } from '@hooks/useSessionCookie'
import { useSessionRefresh } from '@hooks/useSessionRefresh'
import { fetchChoices, fetchSession, fetchUsers } from '@services/api'
import { isSubscribedToPush } from '@services/push'
import { ChoicesMap, SessionData, User } from '@types'
import { isClosingSoonError } from '@utils/session'

type Phase = 'loading' | 'error' | 'winner' | 'user-select' | 'voting' | 'waiting'

// How hard to poll the session, by phase.
//
// Push is a backstop, not a replacement: iOS forbids a push that shows no notification, so we
// cannot silently refresh a foregrounded tab and it still has to poll to advance on its own. What
// subscribing buys is permission to poll LESS, because someone who will be told can afford to
// find out a few seconds later. The real saving is behavioural — people can close the app instead
// of babysitting it.
export const waitingInterval = (phase: Phase, isSubscribed: boolean): number | false => {
  switch (phase) {
    case 'loading':
      // Session creation is a live wait with a spinner on screen; leave it alone.
      return 2_000
    case 'waiting':
      return isSubscribed ? 15_000 : 10_000
    default:
      return false
  }
}

function derivePhase(
  session: SessionData | undefined,
  currentUser: User | undefined,
  userIdentified: boolean,
  usersLoaded: boolean,
  sessionError: unknown,
): Phase {
  // A failed fetch leaves session undefined. Without this the phase stays
  // 'loading' forever and the spinner keeps polling a session that isn't there.
  if (!session) return sessionError ? 'error' : 'loading'
  if (!session.isReady && session.errorMessage == null) return 'loading'
  if (!session.isReady && session.errorMessage != null) return 'error'
  if (session.winner != null) return 'winner'
  if (!usersLoaded) return 'loading'
  if (!userIdentified) return 'user-select'

  if (currentUser && firstUnvotedIndex(session, currentUser) !== -1) {
    return 'voting'
  }

  return 'waiting'
}

function consumeQueryParamId(): string | undefined {
  if (typeof window === 'undefined') return undefined
  const params = new URLSearchParams(window.location.search)
  const id = params.get('id') ?? undefined
  if (id) {
    params.delete('id')
    const qs = params.toString()
    const newUrl = window.location.pathname + (qs ? `?${qs}` : '')
    window.history.replaceState(null, '', newUrl)
  }
  return id
}

export interface SessionProps {
  sessionId: string
}

const Session = ({ sessionId }: SessionProps): React.ReactNode => {
  const queryClient = useQueryClient()
  const { userId, setUserId } = useSessionCookie(sessionId)

  // Read and strip ?id= from URL once on mount so the URL stays clean
  const queryParamId = useMemo(() => consumeQueryParamId(), [])

  // Expose derived phase to refetchInterval via ref so the callback sees the latest phase
  // without duplicating phase logic or needing access to users state.
  const phaseRef = useRef<Phase>('loading')

  // Same trick for the subscription: refetchInterval is called by React Query outside the render
  // cycle, so it reads a ref rather than state.
  const subscribedRef = useRef(false)
  useEffect(() => {
    let cancelled = false
    // A read that never prompts — see services/push.ts. Resolving it once on mount is enough:
    // subscribing later only ever relaxes the interval, and the next poll picks that up.
    void isSubscribedToPush()
      .then((isSubscribed) => {
        if (!cancelled) {
          subscribedRef.current = isSubscribed
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  const { data: session, error: sessionError } = useQuery<SessionData>({
    queryKey: ['session', sessionId],
    queryFn: () => fetchSession(sessionId),
    refetchInterval: () => waitingInterval(phaseRef.current, subscribedRef.current),
  })

  const { data: users } = useQuery<User[]>({
    queryKey: ['users', sessionId],
    queryFn: () => fetchUsers(sessionId),
    enabled: session?.isReady === true,
    refetchInterval: 30_000,
  })

  const { data: choices } = useQuery<ChoicesMap>({
    queryKey: ['choices', sessionId],
    queryFn: () => fetchChoices(sessionId),
    staleTime: Infinity,
    enabled: session?.isReady === true,
  })

  const usersLoaded = session?.isReady === true && users !== undefined

  // Resolve user: query param > cookie > nothing. Only accept IDs present in the users list.
  const effectiveUserId = useMemo(() => {
    if (!users) return undefined
    if (queryParamId && users.some((u) => u.userId === queryParamId)) return queryParamId
    if (userId && users.some((u) => u.userId === userId)) return userId
    return undefined
  }, [queryParamId, userId, users])

  const currentUser = useMemo(() => users?.find((u) => u.userId === effectiveUserId), [users, effectiveUserId])

  // Persist an identity that arrived in the URL. `consumeQueryParamId` strips `?id=` on mount, so
  // without this it survives exactly one page load — and a notification tap is the case that
  // matters: on an installed iOS app, which has its own cookie jar separate from the Safari tab the
  // user joined in, every launch would otherwise land them on "Back again? Choose your name". The
  // spec treats that picker as a one-time recovery path for the install transition, not a thing to
  // meet on every notification.
  useEffect(() => {
    if (queryParamId && queryParamId === effectiveUserId && userId !== queryParamId) {
      setUserId(queryParamId)
    }
  }, [queryParamId, effectiveUserId, userId, setUserId])

  // A browser can rotate this device's push subscription at any time. Only the page knows which
  // session and user it belongs to, so the worker hands the replacement here to be re-registered.
  usePushResubscribe(sessionId, effectiveUserId)

  // Tapping a notification for a session already open here only focuses the window. This is what
  // turns that focus into a refresh, so the round the notification announced is the round on screen.
  useSessionRefresh(sessionId)

  const phase = derivePhase(session, currentUser, effectiveUserId != null, usersLoaded, sessionError)
  phaseRef.current = phase

  const handleUserSelected = (newUserId: string): void => {
    setUserId(newUserId)
    void queryClient.invalidateQueries({ queryKey: ['users', sessionId] })
    // The session too, not just the users list: joining wrote a user row, and voterCount is derived
    // from those rows. The next phase is 'voting', which does not poll (see waitingInterval), so a
    // count read before this join is the one that stays on screen — which is how the second person
    // to join ended up being told they were the only one here.
    void queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
  }

  const renderPhase = (): React.ReactNode => {
    switch (phase) {
      case 'loading':
        return <LoadingPhase session={session} />
      case 'error':
        if (!session) return <ErrorBanner message={sessionLoadErrorMessage(sessionError)} />
        return isClosingSoonError(session?.errorMessage) ? (
          <ClosingSoonErrorAlert />
        ) : (
          <ErrorBanner message={session?.errorMessage ?? 'An unexpected error occurred'} />
        )
      case 'winner':
        return <WinnerPhase choices={choices ?? {}} session={session!} />
      case 'user-select':
        return <UserSelectPhase onUserSelected={handleUserSelected} sessionId={sessionId} users={users ?? []} />
      case 'voting':
        return (
          <VotingPhase
            choices={choices ?? {}}
            currentUser={currentUser!}
            session={session!}
            sessionId={sessionId}
            // The users query keeps polling through the round; the session query does not. Reaching
            // this phase already required a loaded users list, so this is never an empty stand-in.
            voterCount={users!.length}
          />
        )
      case 'waiting':
        return (
          <WaitingPhase choices={choices ?? {}} currentUser={currentUser!} session={session!} sessionId={sessionId} />
        )
      default:
        return null
    }
  }

  return renderPhase()
}

const SessionWithErrorBoundary = ({ sessionId }: SessionProps): React.ReactNode => (
  <ErrorBoundary>
    <Session sessionId={sessionId} />
  </ErrorBoundary>
)

export default SessionWithErrorBoundary
