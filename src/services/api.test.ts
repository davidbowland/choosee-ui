import {
  apiErrorMessage,
  closeRound,
  createSession,
  createUser,
  deletePushSubscription,
  fetchAddress,
  fetchChoices,
  fetchSession,
  fetchSessionConfig,
  fetchUsers,
  fetchVapidPublicKey,
  hasErrorCode,
  hasStatusCode,
  patchUser,
  postPushSubscription,
  setExpectedVoters,
} from './api'
import { apiError } from '@test/__mocks__'
import { ErrorCode } from '@types'

const mockFetch = jest.fn()

const baseUrl = 'http://localhost'
const sessionId = 'fuzzy-penguin'
const userId = 'brave-tiger'
const recaptchaToken = 'test-recaptcha-token'

const jsonResponse = (data: unknown) => ({ json: () => Promise.resolve(data), ok: true, status: 200 })

const emptyResponse = () => ({ ok: true, status: 204 })

const errorResponse = (status: number, body = '') => ({
  ok: false,
  status,
  text: () => Promise.resolve(body),
})

describe('API service', () => {
  beforeAll(() => {
    global.fetch = mockFetch as unknown as typeof fetch
    mockFetch.mockResolvedValue(jsonResponse({}))
  })

  describe('fetchAddress', () => {
    const addressResult = { address: '1600 Pennsylvania Ave' }

    it('should call reverse-geocode with recaptcha header and coordinates', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(addressResult))
      const result = await fetchAddress(38.897, -77.036, recaptchaToken)
      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/reverse-geocode?latitude=38.897&longitude=-77.036`, {
        body: undefined,
        headers: { 'x-recaptcha-token': recaptchaToken },
        method: 'GET',
      })
      expect(result).toEqual(addressResult)
    })
  })

  describe('fetchSessionConfig', () => {
    it('should return session config from response', async () => {
      const config = { placeTypes: [], radius: { maxMiles: 30, minMiles: 1 }, sortOptions: [] }
      mockFetch.mockResolvedValueOnce(jsonResponse(config))
      const result = await fetchSessionConfig()
      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/sessions/config`, {
        body: undefined,
        headers: undefined,
        method: 'GET',
      })
      expect(result).toEqual(config)
    })
  })

  describe('createSession', () => {
    const session = {
      address: 'Columbia, MO',
      exclude: [],
      radiusMiles: 2.33,
      rankBy: 'POPULARITY' as const,
      type: ['restaurant'],
    }

    it('should post session with recaptcha header', async () => {
      const response = { sessionId }
      mockFetch.mockResolvedValueOnce(jsonResponse(response))
      const result = await createSession(session, recaptchaToken)
      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/sessions`, {
        body: JSON.stringify(session),
        headers: { 'Content-Type': 'application/json', 'x-recaptcha-token': recaptchaToken },
        method: 'POST',
      })
      expect(result).toEqual(response)
    })

    it('should send the request exactly once, whatever the server answers', async () => {
      mockFetch.mockResolvedValueOnce(errorResponse(503))
      await expect(createSession(session, recaptchaToken)).rejects.toThrow('POST /sessions responded with 503')
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('fetchSession', () => {
    it('should encode sessionId in path', async () => {
      const session = { isReady: true, sessionId }
      mockFetch.mockResolvedValueOnce(jsonResponse(session))
      const result = await fetchSession(sessionId)
      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/sessions/${encodeURIComponent(sessionId)}`, {
        body: undefined,
        headers: undefined,
        method: 'GET',
      })
      expect(result).toEqual(session)
    })
  })

  describe('fetchChoices', () => {
    it('should fetch choices for session', async () => {
      const choices = { 'choice-a': { choiceId: 'choice-a', name: 'Pizza Place', photos: [] } }
      mockFetch.mockResolvedValueOnce(jsonResponse(choices))
      const result = await fetchChoices(sessionId)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/sessions/${encodeURIComponent(sessionId)}/choices`,
        expect.objectContaining({ method: 'GET' }),
      )
      expect(result).toEqual(choices)
    })
  })

  describe('fetchUsers', () => {
    it('should fetch users for session', async () => {
      const users = [{ name: null, userId, votes: [[]] }]
      mockFetch.mockResolvedValueOnce(jsonResponse(users))
      const result = await fetchUsers(sessionId)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/sessions/${encodeURIComponent(sessionId)}/users`,
        expect.objectContaining({ method: 'GET' }),
      )
      expect(result).toEqual(users)
    })
  })

  describe('createUser', () => {
    const newUser = { name: null, userId: 'clever-fox', votes: [[]] }

    it('should post to the users endpoint with an empty body', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(newUser))
      const result = await createUser(sessionId)
      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/sessions/${encodeURIComponent(sessionId)}/users`, {
        body: '{}',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      expect(result).toEqual(newUser)
    })

    it('should claim a seat exactly once when the server fails', async () => {
      mockFetch.mockResolvedValueOnce(errorResponse(502))
      await expect(createUser(sessionId)).rejects.toThrow('responded with 502')
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('patchUser', () => {
    const operations = [{ op: 'replace' as const, path: '/name', value: 'Alice' }]
    const updatedUser = { name: 'Alice', userId }

    it('should patch the user endpoint with the supplied operations', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(updatedUser))
      const result = await patchUser(sessionId, userId, operations)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/sessions/${encodeURIComponent(sessionId)}/users/${encodeURIComponent(userId)}`,
        {
          body: JSON.stringify(operations),
          headers: { 'Content-Type': 'application/json' },
          method: 'PATCH',
        },
      )
      expect(result).toEqual(updatedUser)
    })
  })

  describe('closeRound', () => {
    it('should post to close round endpoint without a body', async () => {
      const updatedSession = { currentRound: 1, sessionId }
      mockFetch.mockResolvedValueOnce(jsonResponse(updatedSession))
      const result = await closeRound(sessionId, 0)
      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/sessions/${encodeURIComponent(sessionId)}/rounds/0/close`, {
        body: undefined,
        headers: undefined,
        method: 'POST',
      })
      expect(result).toEqual(updatedSession)
    })
  })

  describe('setExpectedVoters', () => {
    it('should patch the session endpoint with the expected count', async () => {
      const updatedSession = { expectedVoters: 4, sessionId }
      mockFetch.mockResolvedValueOnce(jsonResponse(updatedSession))
      const result = await setExpectedVoters(sessionId, 4)
      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/sessions/${encodeURIComponent(sessionId)}`, {
        body: JSON.stringify({ expectedVoters: 4 }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      expect(result).toEqual(updatedSession)
    })
  })

  describe('fetchVapidPublicKey', () => {
    it('should fetch the VAPID public key', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ publicKey: 'BFakePublicKey' }))
      const result = await fetchVapidPublicKey()
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/push/vapid-public-key`,
        expect.objectContaining({ method: 'GET' }),
      )
      expect(result).toEqual({ publicKey: 'BFakePublicKey' })
    })
  })

  describe('postPushSubscription', () => {
    const subscription = {
      endpoint: 'https://fcm.googleapis.com/send/abc',
      keys: { auth: 'auth-key', p256dh: 'p256dh-key' },
    }

    it('should post the subscription to the push-subscription endpoint', async () => {
      mockFetch.mockResolvedValueOnce(emptyResponse())
      await postPushSubscription(sessionId, userId, subscription)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/sessions/${encodeURIComponent(sessionId)}/users/${encodeURIComponent(userId)}/push-subscription`,
        {
          body: JSON.stringify(subscription),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        },
      )
    })

    it('should resolve without reading a body, since the endpoint answers 204', async () => {
      mockFetch.mockResolvedValueOnce(emptyResponse())
      await expect(postPushSubscription(sessionId, userId, subscription)).resolves.toBeUndefined()
    })

    it('should reject when the endpoint fails', async () => {
      mockFetch.mockResolvedValueOnce(errorResponse(500))
      await expect(postPushSubscription(sessionId, userId, subscription)).rejects.toThrow('responded with 500')
    })
  })

  describe('deletePushSubscription', () => {
    const endpoint = 'https://fcm.googleapis.com/send/abc'

    it('should send the endpoint as a query parameter rather than a body', async () => {
      mockFetch.mockResolvedValueOnce(emptyResponse())
      await deletePushSubscription(sessionId, userId, endpoint)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/sessions/${encodeURIComponent(sessionId)}/users/${encodeURIComponent(
          userId,
        )}/push-subscription?endpoint=${encodeURIComponent(endpoint)}`,
        { body: undefined, headers: undefined, method: 'DELETE' },
      )
    })
  })

  describe('failed requests', () => {
    it('should carry the status code and the response body on the thrown error', async () => {
      mockFetch.mockResolvedValueOnce(errorResponse(400, JSON.stringify({ message: 'Max players reached' })))
      const error = await fetchSession(sessionId).catch((err: unknown) => err)
      expect(hasStatusCode(error, 400)).toBe(true)
      expect(apiErrorMessage(error, 'fallback')).toBe('Max players reached')
    })

    it('should surface a connection failure to the caller', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'))
      await expect(fetchSession(sessionId)).rejects.toThrow('Failed to fetch')
    })
  })

  describe('hasStatusCode', () => {
    it('should return true when the error carries the given status', () => {
      expect(hasStatusCode(apiError(403), 403)).toBe(true)
    })

    it('should return false when the error carries a different status', () => {
      expect(hasStatusCode(apiError(400), 403)).toBe(false)
    })

    it('should return false for an error from outside the API', () => {
      expect(hasStatusCode(new Error('network down'), 403)).toBe(false)
    })

    it('should return false for a value that is not an error', () => {
      expect(hasStatusCode({ statusCode: 403 }, 403)).toBe(false)
    })
  })

  describe('hasErrorCode', () => {
    it('should return true when a 400 body names the code', () => {
      const error = apiError(400, JSON.stringify({ errorCode: ErrorCode.ROUND_NOT_CURRENT }))
      expect(hasErrorCode(error, ErrorCode.ROUND_NOT_CURRENT)).toBe(true)
    })

    it('should return false when the body names a different code', () => {
      const error = apiError(400, JSON.stringify({ errorCode: 'SOMETHING_ELSE' }))
      expect(hasErrorCode(error, ErrorCode.ROUND_NOT_CURRENT)).toBe(false)
    })

    it('should return false for a status other than 400', () => {
      const error = apiError(409, JSON.stringify({ errorCode: ErrorCode.ROUND_NOT_CURRENT }))
      expect(hasErrorCode(error, ErrorCode.ROUND_NOT_CURRENT)).toBe(false)
    })

    it('should return false when the body is empty', () => {
      expect(hasErrorCode(apiError(400, ''), ErrorCode.ROUND_NOT_CURRENT)).toBe(false)
    })

    it('should return false for an error from outside the API', () => {
      expect(hasErrorCode(new Error('network down'), ErrorCode.ROUND_NOT_CURRENT)).toBe(false)
    })
  })

  describe('apiErrorMessage', () => {
    it('should extract message from a valid JSON body', () => {
      expect(apiErrorMessage(apiError(400, JSON.stringify({ message: 'Round already closed' })), 'fallback')).toBe(
        'Round already closed',
      )
    })

    it('should return fallback when the body is not valid JSON', () => {
      expect(apiErrorMessage(apiError(400, 'not json'), 'fallback')).toBe('fallback')
    })

    it('should return fallback when the message field is missing', () => {
      expect(apiErrorMessage(apiError(400, JSON.stringify({ error: 'oops' })), 'fallback')).toBe('fallback')
    })

    it('should return fallback when the message field is not a string', () => {
      expect(apiErrorMessage(apiError(400, JSON.stringify({ message: 7 })), 'fallback')).toBe('fallback')
    })

    it('should return fallback for an error from outside the API', () => {
      expect(apiErrorMessage(new Error('network down'), 'fallback')).toBe('fallback')
    })
  })
})
