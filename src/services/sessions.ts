import { API } from 'aws-amplify'
import { apiName, apiNameUnauthenticated } from '@config/amplify'
import { DecisionObject, NewSession, PatchOperation, Restaurant, StatusObject, StringObject } from '@types'

export const createSession = (session: NewSession): Promise<StringObject> =>
  API.post(apiName, '/sessions', { body: session })

export const fetchChoices = (sessionId: string): Promise<Restaurant[]> =>
  API.get(apiNameUnauthenticated, `/sessions/${encodeURIComponent(sessionId)}/choices`, {})

export const fetchDecisions = (sessionId: string, userId: string): Promise<DecisionObject> =>
  API.get(
    apiNameUnauthenticated,
    `/sessions/${encodeURIComponent(sessionId)}/decisions/${encodeURIComponent(userId)}`,
    {}
  )

export const fetchStatus = (sessionId: string): Promise<StatusObject> =>
  API.get(apiNameUnauthenticated, `/sessions/${encodeURIComponent(sessionId)}/status`, {})

export const textSession = (sessionId: string): Promise<StringObject> =>
  API.post(apiName, `/sessions/${encodeURIComponent(sessionId)}/send-text`, { body: {} })

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
