import { ApiError, get, patch, post } from 'aws-amplify/api'

import {
  closeRound,
  createSession,
  createUser,
  fetchAddress,
  fetchChoices,
  fetchSessionConfig,
  fetchSession,
  fetchUsers,
  hasStatusCode,
  parseApiMessage,
  patchUser,
} from './api'

jest.mock('aws-amplify/api')
jest.mock('@config/amplify', () => ({
  apiNameUnauthenticated: 'ChooseeAPIUnauthenticated',
}))

const mockGet = jest.mocked(get)
const mockPost = jest.mocked(post)
const mockPatch = jest.mocked(patch)

const sessionId = 'fuzzy-penguin'
const userId = 'brave-tiger'
const recaptchaToken = 'test-recaptcha-token'

function mockResponse(data: any) {
  return { response: Promise.resolve({ body: { json: () => Promise.resolve(data) } }) } as any
}

describe('API service', () => {
  describe('fetchAddress', () => {
    const addressResult = { address: '1600 Pennsylvania Ave' }

    it('should call reverse-geocode with recaptcha header and coordinates', async () => {
      mockGet.mockReturnValue(mockResponse(addressResult))
      const result = await fetchAddress(38.897, -77.036, recaptchaToken)
      expect(mockGet).toHaveBeenCalledWith({
        apiName: 'ChooseeAPIUnauthenticated',
        path: '/reverse-geocode',
        options: {
          headers: { 'x-recaptcha-token': recaptchaToken },
          queryParams: { latitude: '38.897', longitude: '-77.036' },
        },
      })
      expect(result).toEqual(addressResult)
    })
  })

  describe('fetchSessionConfig', () => {
    it('should return session config from response', async () => {
      const config = { placeTypes: [], sortOptions: [], radius: { minMiles: 1, maxMiles: 30 } }
      mockGet.mockReturnValue(mockResponse(config))
      const result = await fetchSessionConfig()
      expect(mockGet).toHaveBeenCalledWith({
        apiName: 'ChooseeAPIUnauthenticated',
        path: '/sessions/config',
        options: { headers: undefined, queryParams: undefined },
      })
      expect(result).toEqual(config)
    })
  })

  describe('createSession', () => {
    const session = {
      address: 'Columbia, MO',
      type: ['restaurant'],
      exclude: [],
      radiusMiles: 2.33,
      rankBy: 'POPULARITY' as const,
    }

    it('should post session with recaptcha header (unauthenticated)', async () => {
      const response = { sessionId: 'fuzzy-penguin' }
      mockPost.mockReturnValue(mockResponse(response))
      const result = await createSession(session, recaptchaToken)
      expect(mockPost).toHaveBeenCalledWith({
        apiName: 'ChooseeAPIUnauthenticated',
        path: '/sessions',
        options: { headers: { 'x-recaptcha-token': recaptchaToken }, body: session },
      })
      expect(result).toEqual(response)
    })
  })

  describe('fetchSession', () => {
    it('should encode sessionId in path', async () => {
      const session = { sessionId, isReady: true }
      mockGet.mockReturnValue(mockResponse(session))
      const result = await fetchSession(sessionId)
      expect(mockGet).toHaveBeenCalledWith({
        apiName: 'ChooseeAPIUnauthenticated',
        path: `/sessions/${encodeURIComponent(sessionId)}`,
        options: { headers: undefined, queryParams: undefined },
      })
      expect(result).toEqual(session)
    })
  })

  describe('fetchChoices', () => {
    it('should fetch choices for session', async () => {
      const choices = { 'choice-a': { choiceId: 'choice-a', name: 'Pizza Place', photos: [] } }
      mockGet.mockReturnValue(mockResponse(choices))
      const result = await fetchChoices(sessionId)
      expect(mockGet).toHaveBeenCalledWith({
        apiName: 'ChooseeAPIUnauthenticated',
        path: `/sessions/${encodeURIComponent(sessionId)}/choices`,
        options: { headers: undefined, queryParams: undefined },
      })
      expect(result).toEqual(choices)
    })
  })

  describe('fetchUsers', () => {
    it('should fetch users for session', async () => {
      const users = [{ userId, name: null, votes: [[]] }]
      mockGet.mockReturnValue(mockResponse(users))
      const result = await fetchUsers(sessionId)
      expect(result).toEqual(users)
    })
  })

  describe('createUser', () => {
    const newUser = { userId: 'clever-fox', name: null, votes: [[]] }

    it('should post to the users endpoint with an empty body', async () => {
      mockPost.mockReturnValue(mockResponse(newUser))
      const result = await createUser(sessionId)
      expect(mockPost).toHaveBeenCalledWith({
        apiName: 'ChooseeAPIUnauthenticated',
        path: `/sessions/${encodeURIComponent(sessionId)}/users`,
        options: { headers: undefined, body: {} },
      })
      expect(result).toEqual(newUser)
    })
  })

  describe('patchUser', () => {
    const operations = [{ op: 'replace' as const, path: '/name', value: 'Alice' }]
    const updatedUser = { userId, name: 'Alice' }

    it('should patch the user endpoint with the supplied operations', async () => {
      mockPatch.mockReturnValue(mockResponse(updatedUser))
      const result = await patchUser(sessionId, userId, operations)
      expect(mockPatch).toHaveBeenCalledWith({
        apiName: 'ChooseeAPIUnauthenticated',
        path: `/sessions/${encodeURIComponent(sessionId)}/users/${encodeURIComponent(userId)}`,
        options: { body: operations },
      })
      expect(result).toEqual(updatedUser)
    })
  })

  describe('closeRound', () => {
    it('should post to close round endpoint (unauthenticated)', async () => {
      const updatedSession = { sessionId, currentRound: 1 }
      mockPost.mockReturnValue(mockResponse(updatedSession))
      const result = await closeRound(sessionId, 0)
      expect(mockPost).toHaveBeenCalledWith({
        apiName: 'ChooseeAPIUnauthenticated',
        path: `/sessions/${encodeURIComponent(sessionId)}/rounds/0/close`,
        options: { headers: undefined, body: undefined },
      })
      expect(result).toEqual(updatedSession)
    })
  })

  describe('hasStatusCode', () => {
    const apiErrorWith = (statusCode: number): Error => {
      const error = Object.assign(new Error('api failure'), { response: { statusCode, headers: {}, body: '' } })
      Object.setPrototypeOf(error, ApiError.prototype)
      return error
    }

    it('should return true when the ApiError carries the given status', () => {
      expect(hasStatusCode(apiErrorWith(403), 403)).toBe(true)
    })

    it('should return false when the ApiError carries a different status', () => {
      expect(hasStatusCode(apiErrorWith(400), 403)).toBe(false)
    })

    it('should return false for a non-ApiError', () => {
      expect(hasStatusCode(new Error('network down'), 403)).toBe(false)
    })
  })

  describe('parseApiMessage', () => {
    it('should extract message from valid JSON body', () => {
      expect(parseApiMessage(JSON.stringify({ message: 'Round already closed' }), 'fallback')).toBe(
        'Round already closed',
      )
    })

    it('should return fallback when body is undefined', () => {
      expect(parseApiMessage(undefined, 'fallback')).toBe('fallback')
    })

    it('should return fallback when body is not valid JSON', () => {
      expect(parseApiMessage('not json', 'fallback')).toBe('fallback')
    })

    it('should return fallback when message field is missing', () => {
      expect(parseApiMessage(JSON.stringify({ error: 'oops' }), 'fallback')).toBe('fallback')
    })
  })
})
