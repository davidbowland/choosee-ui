import { API } from 'aws-amplify'

import { DecisionObject, NewSession, PatchOperation, Place, StatusObject, StringObject } from '@types'
import { apiName, apiNameUnauthenticated } from '@config/amplify'

export const createSession = (session: NewSession): Promise<StringObject> =>
  API.post(apiName, '/sessions', { body: session })

export const fetchChoices = (sessionId: string): Promise<Place[]> =>
  API.get(apiNameUnauthenticated, `/sessions/${encodeURIComponent(sessionId)}/choices`, {})

export const fetchDecisions = (sessionId: string, userId: string): Promise<DecisionObject> =>
  API.get(
    apiNameUnauthenticated,
    `/sessions/${encodeURIComponent(sessionId)}/decisions/${encodeURIComponent(userId)}`,
    {}
  )

export const fetchStatus = (sessionId: string): Promise<StatusObject> =>
  API.get(apiNameUnauthenticated, `/sessions/${encodeURIComponent(sessionId)}/status`, {})

export const textSession = (sessionId: string, voterId: string): Promise<StringObject> =>
  API.post(apiName, `/sessions/${encodeURIComponent(sessionId)}/send-text/${encodeURIComponent(voterId)}`, { body: {} })

export const updateDecisions = (
  sessionId: string,
  userId: string,
  patchOperations: PatchOperation[]
): Promise<DecisionObject> =>
  API.patch(
    apiNameUnauthenticated,
    `/sessions/${encodeURIComponent(sessionId)}/decisions/${encodeURIComponent(userId)}`,
    { body: patchOperations }
  )
