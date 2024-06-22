import { Auth } from 'aws-amplify'
import { CognitoUserSession } from 'amazon-cognito-identity-js'

import {
  createSession,
  createSessionAuthenticated,
  fetchDecision,
  fetchSession,
  textSession,
  updateDecisions,
  updateSession,
} from './sessions'
import { decisions, jsonPatchOperations, newSession, recaptchaToken, session, sessionId, userId } from '@test/__mocks__'
import { http, HttpResponse, server } from '@test/setup-server'

const baseUrl = process.env.GATSBY_SESSION_API_BASE_URL
jest.mock('@aws-amplify/analytics')

describe('Sessions service', () => {
  beforeAll(() => {
    const userSession = { getIdToken: () => ({ getJwtToken: () => '' }) } as CognitoUserSession
    jest.spyOn(Auth, 'currentSession').mockResolvedValue(userSession)
  })

  describe('createSession', () => {
    const postEndpoint = jest.fn().mockReturnValue({ id: sessionId })

    beforeAll(() => {
      server.use(
        http.post(`${baseUrl}/sessions`, async ({ request }) => {
          if (request.headers.get('x-recaptcha-token') !== recaptchaToken) {
            return new HttpResponse(JSON.stringify({ message: 'Invalid recaptcha token' }), { status: 401 })
          }

          const body = postEndpoint(await request.json())
          return body ? HttpResponse.json(body) : new HttpResponse(null, { status: 400 })
        })
      )
    })

    test('expect endpoint called with session', async () => {
      await createSession(newSession, recaptchaToken)
      expect(postEndpoint).toHaveBeenCalledWith(expect.objectContaining(newSession))
    })

    test('expect result from call returned', async () => {
      const expectedResult = { id: 'aeiou' }
      postEndpoint.mockReturnValue(expectedResult)

      const result = await createSession(newSession, recaptchaToken)
      expect(postEndpoint).toHaveBeenCalledTimes(1)
      expect(result).toEqual(expectedResult)
    })
  })

  describe('createSessionAuthenticated', () => {
    const postEndpoint = jest.fn().mockReturnValue({ id: sessionId })

    beforeAll(() => {
      server.use(
        http.post(`${baseUrl}/sessions/authed`, async ({ request }) => {
          const body = postEndpoint(await request.json())
          return body ? HttpResponse.json(body) : new HttpResponse(null, { status: 400 })
        })
      )
    })

    test('expect endpoint called with session', async () => {
      await createSessionAuthenticated(newSession)
      expect(postEndpoint).toHaveBeenCalledWith(expect.objectContaining(newSession))
    })

    test('expect result from call returned', async () => {
      const expectedResult = { id: 'aeiou' }
      postEndpoint.mockReturnValue(expectedResult)

      const result = await createSessionAuthenticated(newSession)
      expect(postEndpoint).toHaveBeenCalledTimes(1)
      expect(result).toEqual(expectedResult)
    })
  })

  describe('fetchDecision', () => {
    beforeAll(() => {
      server.use(
        http.get(`${baseUrl}/sessions/:id/decisions/:user`, async ({ params }) => {
          const { id, user } = params as { id: string; user: string }
          if (id !== sessionId || decodeURIComponent(user) !== userId) {
            return new HttpResponse(JSON.stringify({ error: 'Invalid session or user id' }), {
              status: 400,
            })
          }
          return HttpResponse.json(decisions)
        })
      )
    })

    test('expect results from returned on fetch', async () => {
      const result = await fetchDecision(sessionId, userId)
      expect(result).toEqual(decisions)
    })
  })

  describe('fetchSession', () => {
    beforeAll(() => {
      server.use(
        http.get(`${baseUrl}/sessions/:id`, async ({ params }) => {
          const { id } = params
          if (id !== sessionId) {
            return new HttpResponse(JSON.stringify({ error: 'Invalid session id' }), { status: 400 })
          }
          return HttpResponse.json(session)
        })
      )
    })

    test('expect results from returned on fetch', async () => {
      const result = await fetchSession(sessionId)
      expect(result).toEqual(session)
    })
  })

  describe('textSession', () => {
    const postEndpoint = jest.fn().mockReturnValue({})
    const toPhoneNumber = '+18005559999'

    beforeAll(() => {
      server.use(
        http.post(`${baseUrl}/sessions/:id/send-text/:to`, async ({ params, request }) => {
          const { id, to } = params
          if (id !== sessionId || to !== toPhoneNumber) {
            return new HttpResponse(JSON.stringify({ error: 'Invalid session or phone number' }), {
              status: 400,
            })
          }
          const body = postEndpoint(await request.json())
          return body ? HttpResponse.json(body) : new HttpResponse(null, { status: 400 })
        })
      )
    })

    test('expect endpoint called with body', async () => {
      await textSession(sessionId, toPhoneNumber)
      expect(postEndpoint).toHaveBeenCalledWith({})
    })
  })

  describe('updateDecisions', () => {
    const patchEndpoint = jest.fn().mockReturnValue({})

    beforeAll(() => {
      server.use(
        http.patch(`${baseUrl}/sessions/:id/decisions/:user`, async ({ params, request }) => {
          const { id, user } = params as { id: string; user: string }
          if (id !== sessionId || decodeURIComponent(user) !== userId) {
            return new HttpResponse(JSON.stringify({ error: 'Invalid session or user id' }), {
              status: 400,
            })
          }
          const body = patchEndpoint(await request.json())
          return body ? HttpResponse.json(body) : new HttpResponse(null, { status: 400 })
        })
      )
    })

    test('expect endpoint called with body', async () => {
      await updateDecisions(sessionId, userId, jsonPatchOperations)
      expect(patchEndpoint).toHaveBeenCalledWith(jsonPatchOperations)
    })
  })

  describe('updateSession', () => {
    const patchEndpoint = jest.fn().mockReturnValue({})

    beforeAll(() => {
      server.use(
        http.patch(`${baseUrl}/sessions/:id`, async ({ params, request }) => {
          const { id } = params
          if (id !== sessionId) {
            return new HttpResponse(JSON.stringify({ error: 'Invalid session id' }), { status: 400 })
          }
          const body = patchEndpoint(await request.json())
          return body ? HttpResponse.json(body) : new HttpResponse(null, { status: 400 })
        })
      )
    })

    test('expect endpoint called with body', async () => {
      await updateSession(sessionId, jsonPatchOperations)
      expect(patchEndpoint).toHaveBeenCalledWith(jsonPatchOperations)
    })
  })
})
