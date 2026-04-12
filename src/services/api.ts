import axios from 'axios'
import axiosRetry from 'axios-retry'

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

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_CHOOSEE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

axiosRetry(api, { retries: 3 })

export const fetchAddress = (latitude: number, longitude: number, token: string): Promise<AddressResult> =>
  api
    .get('/reverse-geocode', {
      params: { latitude, longitude },
      headers: { 'x-recaptcha-token': token },
    })
    .then((r) => r.data)

export const fetchSessionConfig = (): Promise<SessionConfig> => api.get('/sessions/config').then((r) => r.data)

export const createSession = (session: NewSessionRequest, token: string): Promise<{ sessionId: string }> =>
  api
    .post('/sessions', session, {
      headers: { 'x-recaptcha-token': token },
    })
    .then((r) => r.data)

export const fetchSession = (sessionId: string): Promise<SessionData> =>
  api.get(`/sessions/${encodeURIComponent(sessionId)}`).then((r) => r.data)

export const fetchChoices = (sessionId: string): Promise<ChoicesMap> =>
  api.get(`/sessions/${encodeURIComponent(sessionId)}/choices`).then((r) => r.data)

export const fetchUsers = (sessionId: string): Promise<User[]> =>
  api.get(`/sessions/${encodeURIComponent(sessionId)}/users`).then((r) => r.data)

export const createUser = (sessionId: string): Promise<User> =>
  api.post(`/sessions/${encodeURIComponent(sessionId)}/users`, {}).then((r) => r.data)

export const patchUser = (sessionId: string, userId: string, operations: PatchOperation[]): Promise<User> =>
  api
    .patch(`/sessions/${encodeURIComponent(sessionId)}/users/${encodeURIComponent(userId)}`, operations)
    .then((r) => r.data)

export const closeRound = (sessionId: string, roundId: number): Promise<SessionData> =>
  api.post(`/sessions/${encodeURIComponent(sessionId)}/rounds/${roundId}/close`).then((r) => r.data)

export const subscribeToRound = (sessionId: string, roundId: number, userId: string): Promise<User> =>
  api
    .post(`/sessions/${encodeURIComponent(sessionId)}/rounds/${roundId}/subscribe`, {
      userId,
      roundId,
    })
    .then((r) => r.data)

export interface ShareResult {
  userId: string
}

export const shareSession = (sessionId: string, userId: string, phone: string): Promise<ShareResult> =>
  api
    .post(`/sessions/${encodeURIComponent(sessionId)}/users/${encodeURIComponent(userId)}/share`, {
      phone,
      type: 'text',
    })
    .then((r) => r.data)

export function hasErrorCode(err: unknown, code: ErrorCode): boolean {
  if (!axios.isAxiosError(err)) return false
  return err.response?.status === 400 && err.response?.data?.errorCode === code
}
