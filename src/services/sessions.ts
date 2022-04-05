import { API } from 'aws-amplify'

import { DecisionObject, NewSession, PatchOperation, SessionData, StringObject } from '@types'
import { sessionApiName, sessionApiNameUnauthenticated } from '@config/amplify'

export const createSession = (session: NewSession): Promise<StringObject> =>
  API.post(sessionApiName, '/sessions', { body: session })

export const fetchDecisions = (sessionId: string, userId: string): Promise<DecisionObject> =>
  API.get(
    sessionApiNameUnauthenticated,
    `/sessions/${encodeURIComponent(sessionId)}/decisions/${encodeURIComponent(userId)}`,
    {}
  )

export const fetchSession = (sessionId: string): Promise<SessionData> =>
  API.get(sessionApiNameUnauthenticated, `/sessions/${encodeURIComponent(sessionId)}`, {})

export const textSession = (sessionId: string, voterId: string): Promise<StringObject> =>
  API.post(sessionApiName, `/sessions/${encodeURIComponent(sessionId)}/send-text/${encodeURIComponent(voterId)}`, {
    body: {},
  })

export const updateDecisions = (
  sessionId: string,
  userId: string,
  patchOperations: PatchOperation[]
): Promise<DecisionObject> =>
  API.patch(
    sessionApiNameUnauthenticated,
    `/sessions/${encodeURIComponent(sessionId)}/decisions/${encodeURIComponent(userId)}`,
    { body: patchOperations }
  )
