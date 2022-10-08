import { API } from 'aws-amplify'

import { Decision, NewSession, PatchOperation, SessionData, StringObject } from '@types'
import { sessionApiName, sessionApiNameUnauthenticated } from '@config/amplify'

export const createSession = (session: NewSession, token: string): Promise<StringObject> =>
  API.post(sessionApiNameUnauthenticated, '/sessions', { body: session, headers: { 'x-recaptcha-token': token } })

export const createSessionAuthenticated = (session: NewSession): Promise<StringObject> =>
  API.post(sessionApiName, '/sessions/authed', { body: session })

export const fetchDecision = (sessionId: string, userId: string): Promise<Decision> =>
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
): Promise<Decision> =>
  API.patch(
    sessionApiNameUnauthenticated,
    `/sessions/${encodeURIComponent(sessionId)}/decisions/${encodeURIComponent(userId)}`,
    { body: patchOperations }
  )

export const updateSession = (sessionId: string, patchOperations: PatchOperation[]): Promise<SessionData> =>
  API.patch(sessionApiName, `/sessions/${encodeURIComponent(sessionId)}`, { body: patchOperations })
