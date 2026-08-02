import { useCallback, useState } from 'react'

import { findJoinedSession, rememberSession } from '@utils/joined-sessions'

export interface SessionDetails {
  address: string
  /** 0-based, as the API reports it. */
  currentRound: number
  totalRounds: number
}

/**
 * Which voter this device is, for one Choosee. Backed by the same record the home page reads, so
 * there is exactly one place an identity lives. The lookup ignores dismissal: tidying the home page
 * must not log anyone out.
 */
export function useSessionIdentity(sessionId: string) {
  const [userId, setUserIdState] = useState<string | undefined>(() => findJoinedSession(sessionId)?.userId)

  const setUserId = useCallback(
    (id: string, details: SessionDetails) => {
      rememberSession({ sessionId, userId: id, ...details })
      setUserIdState(id)
    },
    [sessionId],
  )

  return { setUserId, userId }
}
