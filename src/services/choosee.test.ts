import {
  choiceId,
  choices,
  decisions,
  jsonPatchOperations,
  newSession,
  recaptchaToken,
  session,
  sessionId,
  userId,
} from '@test/__mocks__'
import { CognitoUserSession } from 'amazon-cognito-identity-js'
import { API, Auth } from 'aws-amplify'

import {
  createSession,
  createSessionAuthenticated,
  fetchAddress,
  fetchAddressAuthenticated,
  fetchChoices,
  fetchDecision,
  fetchPlaceTypes,
  fetchSession,
  textSession,
  updateDecision,
  updateSession,
} from './choosee'
import { PlaceTypeDisplay } from '@types'

jest.mock('aws-amplify')

describe('Maps service', () => {
  beforeAll(() => {
    const userSession = { getIdToken: () => ({ getJwtToken: () => '' }) } as CognitoUserSession
    jest.mocked(Auth.currentSession).mockResolvedValue(userSession)
  })

  // Geocode

  describe('fetchAddress', () => {
    const address = '90210'
    const coords = {
      latitude: 38.897957,
      longitude: -77.03656,
    }

    beforeAll(() => {
      jest.mocked(API.get).mockResolvedValue({ address })
    })

    it('should return results from fetch', async () => {
      const result = await fetchAddress(coords.latitude, coords.longitude, recaptchaToken)
      expect(API.get).toHaveBeenCalledWith(expect.any(String), '/reverse-geocode', {
        headers: { 'x-recaptcha-token': recaptchaToken },
        queryStringParameters: { latitude: coords.latitude, longitude: coords.longitude },
      })
      expect(result).toEqual({ address })
    })
  })

  describe('fetchAddressAuthenticated', () => {
    const address = '90210'
    const coords = {
      latitude: 38.897957,
      longitude: -77.03656,
    }

    beforeAll(() => {
      jest.mocked(API.get).mockResolvedValue({ address })
    })

    it('should return results from authenticated fetch', async () => {
      const result = await fetchAddressAuthenticated(coords.latitude, coords.longitude)
      expect(API.get).toHaveBeenCalledWith(expect.any(String), '/reverse-geocode/authed', {
        queryStringParameters: { latitude: coords.latitude, longitude: coords.longitude },
      })
      expect(result).toEqual({ address })
    })
  })

  // Choices

  describe('fetchChoices', () => {
    beforeAll(() => {
      jest.mocked(API.get).mockResolvedValue({ choices })
    })

    it('should return choices from fetch', async () => {
      const result = await fetchChoices(choiceId)
      expect(API.get).toHaveBeenCalledWith(expect.any(String), `/choices/${encodeURIComponent(choiceId)}`, {})
      expect(result).toEqual(choices)
    })
  })

  // Decisions

  describe('fetchDecision', () => {
    beforeAll(() => {
      jest.mocked(API.get).mockResolvedValue(decisions)
    })

    it('should return decisions from fetch', async () => {
      const result = await fetchDecision(sessionId, userId)
      expect(API.get).toHaveBeenCalledWith(
        expect.any(String),
        `/sessions/${encodeURIComponent(sessionId)}/decisions/${encodeURIComponent(userId)}`,
        {},
      )
      expect(result).toEqual(decisions)
    })
  })

  describe('updateDecision', () => {
    const mockResponse = { updated: true }

    beforeAll(() => {
      jest.mocked(API.patch).mockResolvedValue(mockResponse)
    })

    it('should call endpoint with correct body', async () => {
      const result = await updateDecision(sessionId, userId, jsonPatchOperations)
      expect(API.patch).toHaveBeenCalledWith(
        expect.any(String),
        `/sessions/${encodeURIComponent(sessionId)}/decisions/${encodeURIComponent(userId)}`,
        { body: jsonPatchOperations },
      )
      expect(result).toEqual(mockResponse)
    })
  })

  // Sessions

  describe('createSession', () => {
    const expectedResult = { id: sessionId }

    beforeAll(() => {
      jest.mocked(API.post).mockResolvedValue(expectedResult)
    })

    it('should call endpoint with session data', async () => {
      const result = await createSession(newSession, recaptchaToken)
      expect(API.post).toHaveBeenCalledWith(expect.any(String), '/sessions', {
        body: newSession,
        headers: { 'x-recaptcha-token': recaptchaToken },
      })
      expect(result).toEqual(expectedResult)
    })

    it('should return result from API call', async () => {
      const customResult = { id: 'aeiou' }
      jest.mocked(API.post).mockResolvedValueOnce(customResult)

      const result = await createSession(newSession, recaptchaToken)
      expect(result).toEqual(customResult)
    })
  })

  describe('createSessionAuthenticated', () => {
    const expectedResult = { id: sessionId }

    beforeAll(() => {
      jest.mocked(API.post).mockResolvedValue(expectedResult)
    })

    it('should call endpoint with session data', async () => {
      const result = await createSessionAuthenticated(newSession)
      expect(API.post).toHaveBeenCalledWith(expect.any(String), '/sessions/authed', { body: newSession })
      expect(result).toEqual(expectedResult)
    })

    it('should return result from API call', async () => {
      const customResult = { id: 'aeiou' }
      jest.mocked(API.post).mockResolvedValueOnce(customResult)

      const result = await createSessionAuthenticated(newSession)
      expect(result).toEqual(customResult)
    })
  })

  describe('fetchSession', () => {
    beforeAll(() => {
      jest.mocked(API.get).mockResolvedValue(session)
    })

    it('should return session data from fetch', async () => {
      const result = await fetchSession(sessionId)
      expect(API.get).toHaveBeenCalledWith(expect.any(String), `/sessions/${encodeURIComponent(sessionId)}`, {})
      expect(result).toEqual(session)
    })
  })

  describe('textSession', () => {
    const toPhoneNumber = '+18005559999'
    const expectedResult = { success: true }

    beforeAll(() => {
      jest.mocked(API.post).mockResolvedValue(expectedResult)
    })

    it('should call endpoint with empty body', async () => {
      const result = await textSession(sessionId, toPhoneNumber)
      expect(API.post).toHaveBeenCalledWith(
        expect.any(String),
        `/sessions/${encodeURIComponent(sessionId)}/send-text/${encodeURIComponent(toPhoneNumber)}`,
        { body: {} },
      )
      expect(result).toEqual(expectedResult)
    })
  })

  describe('updateSession', () => {
    const expectedResult = { updated: true }

    beforeAll(() => {
      jest.mocked(API.patch).mockResolvedValue(expectedResult)
    })

    it('should call endpoint with patch operations', async () => {
      const result = await updateSession(sessionId, jsonPatchOperations)
      expect(API.patch).toHaveBeenCalledWith(expect.any(String), `/sessions/${encodeURIComponent(sessionId)}`, {
        body: jsonPatchOperations,
      })
      expect(result).toEqual(expectedResult)
    })
  })

  // Places

  describe('fetchPlaceTypes', () => {
    const placeTypes: PlaceTypeDisplay[] = [
      { display: 'Restaurant', value: 'restaurant' },
      { display: 'Cafe', value: 'cafe' },
    ]

    beforeAll(() => {
      jest.mocked(API.get).mockResolvedValue({ types: placeTypes })
    })

    it('should return place types from API', async () => {
      const result = await fetchPlaceTypes()
      expect(API.get).toHaveBeenCalledWith(expect.any(String), '/places/types', {})
      expect(result).toEqual(placeTypes)
    })
  })
})
