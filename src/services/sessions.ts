import { API } from 'aws-amplify'
import { apiName } from '@config/amplify'
import { DecisionObject, NewSession, StatusObject, StringObject } from '@types'

export const createSession = (session: NewSession): Promise<StringObject> =>
  API.post(apiName, '/sessions', { body: session })

export const fetchChoices = (sessionId: string): Promise<DecisionObject> =>
  API.get(apiName, `/sessions/${encodeURIComponent(sessionId)}/choices`, {})

export const fetchDecisions = (sessionId: string, userId: string): Promise<DecisionObject> =>
  API.get(apiName, `/sessions/${encodeURIComponent(sessionId)}/decisions/${encodeURIComponent(userId)}`, {})

export const fetchStatus = (sessionId: string): Promise<StatusObject> =>
  API.get(apiName, `/sessions/${encodeURIComponent(sessionId)}/status`, {})

export const textSession = (sessionId: string): Promise<StringObject> =>
  API.post(apiName, `/sessions/${encodeURIComponent(sessionId)}/send-text`, { body: {} })
