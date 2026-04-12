import { useQuery, useQueryClient } from '@tanstack/react-query'
import React, { useMemo, useRef } from 'react'

import { ErrorBanner } from './elements'
import { firstUnvotedIndex } from './helpers'
import LoadingPhase from './loading'
import UserSelectPhase from './user-select'
import VotingPhase from './voting'
import WaitingPhase from './waiting'
import WinnerPhase from './winner'
import ErrorBoundary from '@components/error-boundary'
import { useSessionCookie } from '@hooks/useSessionCookie'
import { fetchChoices, fetchSession, fetchUsers } from '@services/api'
import { ChoicesMap, SessionData, User } from '@types'

type Phase = 'loading' | 'error' | 'winner' | 'user-select' | 'voting' | 'waiting'

function derivePhase(
  session: SessionData | undefined,
  currentUser: User | undefined,
  userIdentified: boolean,
  usersLoaded: boolean,
): Phase {
  if (!session) return 'loading'
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

  const { data: session } = useQuery<SessionData>({
    queryKey: ['session', sessionId],
    queryFn: () => fetchSession(sessionId),
    refetchInterval: () => {
      switch (phaseRef.current) {
      case 'loading':
        return 2_000
      case 'waiting':
        return 5_000
      default:
        return false
      }
    },
  })

  const { data: users } = useQuery<User[]>({
    queryKey: ['users', sessionId],
    queryFn: () => fetchUsers(sessionId),
    enabled: session?.isReady === true,
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

  const phase = derivePhase(session, currentUser, effectiveUserId != null, usersLoaded)
  phaseRef.current = phase

  const handleUserSelected = (newUserId: string): void => {
    setUserId(newUserId)
    void queryClient.invalidateQueries({ queryKey: ['users', sessionId] })
  }

  const renderPhase = (): React.ReactNode => {
    switch (phase) {
    case 'loading':
      return <LoadingPhase session={session} />
    case 'error':
      return <ErrorBanner message={session?.errorMessage ?? 'An unexpected error occurred'} />
    case 'winner':
      return <WinnerPhase choices={choices ?? {}} session={session!} />
    case 'user-select':
      return <UserSelectPhase onUserSelected={handleUserSelected} sessionId={sessionId} users={users ?? []} />
    case 'voting':
      return (
        <VotingPhase choices={choices ?? {}} currentUser={currentUser!} session={session!} sessionId={sessionId} />
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
