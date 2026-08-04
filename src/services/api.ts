import { ApiError, get, patch, post } from 'aws-amplify/api'

import { apiNameUnauthenticated } from '@config/amplify'
import {
  AddressResult,
  ChoicesMap,
  ErrorCode,
  NewSessionRequest,
  PatchOperation,
  SessionConfig,
  SessionData,
  User,
} from '@types'

type AnyBody = any

// --- Helpers ---

async function apiGet<T>(
  path: string,
  queryParams?: Record<string, string>,
  headers?: Record<string, string>,
): Promise<T> {
  const { body } = await get({ apiName: apiNameUnauthenticated, path, options: { headers, queryParams } }).response
  return body.json() as Promise<T>
}

async function apiPost<T>(path: string, reqBody?: AnyBody, headers?: Record<string, string>): Promise<T> {
  const { body } = await post({
    apiName: apiNameUnauthenticated,
    path,
    options: { headers, body: reqBody },
  }).response
  return body.json() as Promise<T>
}

async function apiPatch<T>(path: string, reqBody?: AnyBody): Promise<T> {
  const { body } = await patch({
    apiName: apiNameUnauthenticated,
    path,
    options: { body: reqBody },
  }).response
  return body.json() as Promise<T>
}

// --- Public API ---

export const fetchAddress = (latitude: number, longitude: number, token: string): Promise<AddressResult> =>
  apiGet(
    '/reverse-geocode',
    { latitude: String(latitude), longitude: String(longitude) },
    { 'x-recaptcha-token': token },
  )

export const fetchSessionConfig = (): Promise<SessionConfig> => apiGet('/sessions/config')

export const createSession = (session: NewSessionRequest, token: string): Promise<{ sessionId: string }> =>
  apiPost('/sessions', session, { 'x-recaptcha-token': token })

export const fetchSession = (sessionId: string): Promise<SessionData> =>
  apiGet(`/sessions/${encodeURIComponent(sessionId)}`)

export const fetchChoices = (sessionId: string): Promise<ChoicesMap> =>
  apiGet(`/sessions/${encodeURIComponent(sessionId)}/choices`)

export const fetchUsers = (sessionId: string): Promise<User[]> =>
  apiGet(`/sessions/${encodeURIComponent(sessionId)}/users`)

export const createUser = (sessionId: string): Promise<User> =>
  apiPost(`/sessions/${encodeURIComponent(sessionId)}/users`, {})

export const patchUser = (sessionId: string, userId: string, operations: PatchOperation[]): Promise<User> =>
  apiPatch(`/sessions/${encodeURIComponent(sessionId)}/users/${encodeURIComponent(userId)}`, operations)

export const closeRound = (sessionId: string, roundId: number): Promise<SessionData> =>
  apiPost(`/sessions/${encodeURIComponent(sessionId)}/rounds/${roundId}/close`)

export function parseApiMessage(body: string | undefined, fallback: string): string {
  return parseBodyField(body, 'message') ?? fallback
}

export function hasStatusCode(err: unknown, statusCode: number): boolean {
  return err instanceof ApiError && err.response?.statusCode === statusCode
}

export function hasErrorCode(err: unknown, code: ErrorCode): boolean {
  if (err instanceof ApiError && err.response) {
    if (err.response.statusCode !== 400 || !err.response.body) return false
    return parseBodyField(err.response.body, 'errorCode') === code
  }
  return false
}

function parseBodyField(body: string | undefined, field: string): string | undefined {
  try {
    const parsed = JSON.parse(body ?? '{}') as Record<string, unknown>
    const value = parsed[field]
    return typeof value === 'string' ? value : undefined
  } catch {
    return undefined
  }
}
