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

const baseUrl = process.env.NEXT_PUBLIC_CHOOSEE_API_BASE_URL

// Plain `fetch`, deliberately, in place of the Amplify REST client. Amplify retried every request
// up to three times on a 5xx or a dropped connection, which is exactly the case where the server
// may already have done the work. Half of the calls below are non-idempotent: POST /sessions spends
// a Places search and creates a Choosee, POST /users consumes one of a session's capped seats, and
// POST /rounds/{n}/close advances the tournament. A replayed one of those bills twice, fills the
// session with a phantom player, or reports failure for something that in fact succeeded. Nothing
// here needs SigV4 signing or credential resolution — every endpoint is unauthenticated — so the
// client was earning nothing but that retry. The query layer already sets `retry: false`; this
// keeps the network layer honest about the same promise.

/** The shape thrown for any non-2xx response. `body` is the raw text, for the API's own message. */
interface ApiRequestError extends Error {
  body: string
  statusCode: number
}

interface RequestOptions {
  body?: unknown
  headers?: Record<string, string>
  queryParams?: Record<string, string>
}

// --- Helpers ---

const buildUrl = (path: string, queryParams?: Record<string, string>): string =>
  queryParams === undefined ? `${baseUrl}${path}` : `${baseUrl}${path}?${new URLSearchParams(queryParams)}`

const sendRequest = async (method: string, path: string, options: RequestOptions = {}): Promise<Response> => {
  const { body, headers, queryParams } = options
  const response = await fetch(buildUrl(path, queryParams), {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? headers : { ...headers, 'Content-Type': 'application/json' },
    method,
  })
  if (!response.ok) {
    const error: ApiRequestError = Object.assign(new Error(`${method} ${path} responded with ${response.status}`), {
      body: await response.text(),
      statusCode: response.status,
    })
    throw error
  }
  return response
}

const requestJson = async <T>(method: string, path: string, options?: RequestOptions): Promise<T> =>
  (await sendRequest(method, path, options)).json() as Promise<T>

// --- Public API ---

export const fetchAddress = (latitude: number, longitude: number, token: string): Promise<AddressResult> =>
  requestJson('GET', '/reverse-geocode', {
    headers: { 'x-recaptcha-token': token },
    queryParams: { latitude: String(latitude), longitude: String(longitude) },
  })

export const fetchSessionConfig = (): Promise<SessionConfig> => requestJson('GET', '/sessions/config')

export const createSession = (session: NewSessionRequest, token: string): Promise<{ sessionId: string }> =>
  requestJson('POST', '/sessions', { body: session, headers: { 'x-recaptcha-token': token } })

export const fetchSession = (sessionId: string): Promise<SessionData> =>
  requestJson('GET', `/sessions/${encodeURIComponent(sessionId)}`)

export const fetchChoices = (sessionId: string): Promise<ChoicesMap> =>
  requestJson('GET', `/sessions/${encodeURIComponent(sessionId)}/choices`)

export const fetchUsers = (sessionId: string): Promise<User[]> =>
  requestJson('GET', `/sessions/${encodeURIComponent(sessionId)}/users`)

export const createUser = (sessionId: string): Promise<User> =>
  requestJson('POST', `/sessions/${encodeURIComponent(sessionId)}/users`, { body: {} })

export const patchUser = (sessionId: string, userId: string, operations: PatchOperation[]): Promise<User> =>
  requestJson('PATCH', `/sessions/${encodeURIComponent(sessionId)}/users/${encodeURIComponent(userId)}`, {
    body: operations,
  })

export const closeRound = (sessionId: string, roundId: number): Promise<SessionData> =>
  requestJson('POST', `/sessions/${encodeURIComponent(sessionId)}/rounds/${roundId}/close`)

// Answers with the whole session, not just the value written: the API runs the advance check before
// it responds, so the body may already describe a round the count just opened.
export const setExpectedVoters = (sessionId: string, expectedVoters: number): Promise<SessionData> =>
  requestJson('PATCH', `/sessions/${encodeURIComponent(sessionId)}`, { body: { expectedVoters } })

export const fetchVapidPublicKey = (): Promise<{ publicKey: string }> => requestJson('GET', '/push/vapid-public-key')

// The endpoint answers 204, so the response body is never read: parsing an empty payload as JSON
// would reject on a request that in fact succeeded.
export const postPushSubscription = async (
  sessionId: string,
  userId: string,
  subscription: PushSubscriptionJSON,
): Promise<void> => {
  await sendRequest(
    'POST',
    `/sessions/${encodeURIComponent(sessionId)}/users/${encodeURIComponent(userId)}/push-subscription`,
    { body: subscription },
  )
}

// The endpoint travels as a query parameter, not a body: a body on DELETE is legal but poorly
// supported across proxies and clients.
export const deletePushSubscription = async (sessionId: string, userId: string, endpoint: string): Promise<void> => {
  await sendRequest(
    'DELETE',
    `/sessions/${encodeURIComponent(sessionId)}/users/${encodeURIComponent(userId)}/push-subscription`,
    { queryParams: { endpoint } },
  )
}

// --- Error inspection ---

const isApiRequestError = (err: unknown): err is ApiRequestError =>
  err instanceof Error && typeof (err as ApiRequestError).statusCode === 'number'

const parseBodyField = (body: string | undefined, field: string): string | undefined => {
  try {
    const parsed = JSON.parse(body ?? '{}') as Record<string, unknown>
    const value = parsed[field]
    return typeof value === 'string' ? value : undefined
  } catch {
    return undefined
  }
}

export const hasStatusCode = (err: unknown, statusCode: number): boolean =>
  isApiRequestError(err) && err.statusCode === statusCode

export const hasErrorCode = (err: unknown, code: ErrorCode): boolean =>
  isApiRequestError(err) && err.statusCode === 400 && parseBodyField(err.body, 'errorCode') === code

/** The API's own explanation of a failure, when it sent one, and `fallback` otherwise. */
export const apiErrorMessage = (err: unknown, fallback: string): string =>
  (isApiRequestError(err) ? parseBodyField(err.body, 'message') : undefined) ?? fallback
