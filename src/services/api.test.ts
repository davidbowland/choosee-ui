import axios from 'axios'

import {
  closeRound,
  createSession,
  createUser,
  fetchAddress,
  fetchChoices,
  fetchSessionConfig,
  fetchSession,
  fetchUsers,
  patchUser,
  shareSession,
  subscribeToRound,
} from './api'

/* eslint-disable @typescript-eslint/no-explicit-any */

// jest.mock factories are hoisted above variable declarations, so we define
// the mock instance inside the factory and extract it via axios.create's return.
jest.mock('axios', () => {
  const instance = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  }
  return { create: jest.fn(() => instance) }
})
jest.mock('axios-retry')

const mockApi = (axios.create as jest.Mock)() as {
  get: jest.Mock
  post: jest.Mock
  patch: jest.Mock
}

const sessionId = 'fuzzy-penguin'
const userId = 'brave-tiger'
const recaptchaToken = 'test-recaptcha-token'
const axiosError = (status: number, data: any) => {
  const err: any = new Error(`Request failed with status ${status}`)
  err.response = { status, data }
  err.isAxiosError = true
  return err
}

describe('API service', () => {
  describe('fetchAddress', () => {
    const addressResult = { address: '1600 Pennsylvania Ave' }

    beforeAll(() => {
      mockApi.get.mockResolvedValue({ data: addressResult })
    })

    it('should call reverse-geocode with recaptcha header and coordinates', async () => {
      const result = await fetchAddress(38.897, -77.036, recaptchaToken)
      expect(mockApi.get).toHaveBeenCalledWith('/reverse-geocode', {
        params: { latitude: 38.897, longitude: -77.036 },
        headers: { 'x-recaptcha-token': recaptchaToken },
      })
      expect(result).toEqual(addressResult)
    })

    it('should propagate 403 errors', async () => {
      mockApi.get.mockRejectedValueOnce(axiosError(403, { message: 'reCAPTCHA failed' }))
      await expect(fetchAddress(0, 0, recaptchaToken)).rejects.toThrow()
    })
  })

  describe('fetchSessionConfig', () => {
    const config = {
      placeTypes: [{ value: 'restaurant', display: 'Restaurant', defaultType: true }],
      sortOptions: [{ value: 'POPULARITY', label: 'Most popular', description: 'Highest rated first' }],
      radius: { minMiles: 1, maxMiles: 30 },
    }

    beforeAll(() => {
      mockApi.get.mockResolvedValue({ data: config })
    })

    it('should return session config from response', async () => {
      const result = await fetchSessionConfig()
      expect(mockApi.get).toHaveBeenCalledWith('/sessions/config')
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
    const response = { sessionId: 'fuzzy-penguin' }

    beforeAll(() => {
      mockApi.post.mockResolvedValue({ data: response })
    })

    it('should post session with recaptcha header', async () => {
      const result = await createSession(session, recaptchaToken)
      expect(mockApi.post).toHaveBeenCalledWith('/sessions', session, {
        headers: { 'x-recaptcha-token': recaptchaToken },
      })
      expect(result).toEqual(response)
    })

    it('should propagate 403 errors', async () => {
      mockApi.post.mockRejectedValueOnce(axiosError(403, { message: 'Unusual traffic' }))
      await expect(createSession(session, recaptchaToken)).rejects.toThrow()
    })
  })

  describe('fetchSession', () => {
    const session = { sessionId, isReady: true }

    beforeAll(() => {
      mockApi.get.mockResolvedValue({ data: session })
    })

    it('should encode sessionId in path', async () => {
      const result = await fetchSession(sessionId)
      expect(mockApi.get).toHaveBeenCalledWith(`/sessions/${encodeURIComponent(sessionId)}`)
      expect(result).toEqual(session)
    })

    it('should propagate 404 errors', async () => {
      mockApi.get.mockRejectedValueOnce(axiosError(404, { message: 'Not found' }))
      await expect(fetchSession(sessionId)).rejects.toThrow()
    })
  })

  describe('fetchChoices', () => {
    const choices = { 'choice-a': { choiceId: 'choice-a', name: 'Pizza Place', photos: [] } }

    beforeAll(() => {
      mockApi.get.mockResolvedValue({ data: choices })
    })

    it('should fetch choices for session', async () => {
      const result = await fetchChoices(sessionId)
      expect(mockApi.get).toHaveBeenCalledWith(`/sessions/${encodeURIComponent(sessionId)}/choices`)
      expect(result).toEqual(choices)
    })
  })

  describe('fetchUsers', () => {
    const users = [{ userId, name: null, votes: [[]] }]

    beforeAll(() => {
      mockApi.get.mockResolvedValue({ data: users })
    })

    it('should fetch users for session', async () => {
      const result = await fetchUsers(sessionId)
      expect(mockApi.get).toHaveBeenCalledWith(`/sessions/${encodeURIComponent(sessionId)}/users`)
      expect(result).toEqual(users)
    })
  })

  describe('createUser', () => {
    const newUser = { userId: 'clever-fox', name: null, votes: [[]] }

    beforeAll(() => {
      mockApi.post.mockResolvedValue({ data: newUser })
    })

    it('should post empty body to users endpoint', async () => {
      const result = await createUser(sessionId)
      expect(mockApi.post).toHaveBeenCalledWith(`/sessions/${encodeURIComponent(sessionId)}/users`, {})
      expect(result).toEqual(newUser)
    })

    it('should propagate 400 when max users reached', async () => {
      mockApi.post.mockRejectedValueOnce(axiosError(400, { message: 'Max users reached' }))
      await expect(createUser(sessionId)).rejects.toThrow()
    })
  })

  describe('patchUser', () => {
    const operations = [{ op: 'replace' as const, path: '/name', value: 'Alice' }]
    const updatedUser = { userId, name: 'Alice' }

    beforeAll(() => {
      mockApi.patch.mockResolvedValue({ data: updatedUser })
    })

    it('should patch user with operations', async () => {
      const result = await patchUser(sessionId, userId, operations)
      expect(mockApi.patch).toHaveBeenCalledWith(
        `/sessions/${encodeURIComponent(sessionId)}/users/${encodeURIComponent(userId)}`,
        operations,
      )
      expect(result).toEqual(updatedUser)
    })

    it('should propagate 409 conflict errors', async () => {
      mockApi.patch.mockRejectedValueOnce(axiosError(409, { message: 'Conflict' }))
      await expect(patchUser(sessionId, userId, operations)).rejects.toThrow()
    })
  })

  describe('closeRound', () => {
    const updatedSession = { sessionId, currentRound: 1 }

    beforeAll(() => {
      mockApi.post.mockResolvedValue({ data: updatedSession })
    })

    it('should post to close round endpoint', async () => {
      const result = await closeRound(sessionId, 0)
      expect(mockApi.post).toHaveBeenCalledWith(`/sessions/${encodeURIComponent(sessionId)}/rounds/0/close`)
      expect(result).toEqual(updatedSession)
    })
  })

  describe('subscribeToRound', () => {
    const updatedUser = { userId, subscribedRounds: [1] }

    beforeAll(() => {
      mockApi.post.mockResolvedValue({ data: updatedUser })
    })

    it('should post subscription with userId and roundId', async () => {
      const result = await subscribeToRound(sessionId, 1, userId)
      expect(mockApi.post).toHaveBeenCalledWith(`/sessions/${encodeURIComponent(sessionId)}/rounds/1/subscribe`, {
        userId,
        roundId: 1,
      })
      expect(result).toEqual(updatedUser)
    })
  })

  describe('shareSession', () => {
    const response = { userId: 'clever-fox' }

    beforeAll(() => {
      mockApi.post.mockResolvedValue({ data: response })
    })

    it('should post share with phone and type', async () => {
      const result = await shareSession(sessionId, userId, '+15559876543')
      expect(mockApi.post).toHaveBeenCalledWith(
        `/sessions/${encodeURIComponent(sessionId)}/users/${encodeURIComponent(userId)}/share`,
        { phone: '+15559876543', type: 'text' },
      )
      expect(result).toEqual(response)
    })

    it('should propagate 429 rate limit errors', async () => {
      mockApi.post.mockRejectedValueOnce(axiosError(429, { message: 'Rate limit exceeded' }))
      await expect(shareSession(sessionId, userId, '+15559876543')).rejects.toThrow()
    })
  })
})
