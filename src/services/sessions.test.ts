import { Auth } from 'aws-amplify'
import { CognitoUserSession } from 'amazon-cognito-identity-js'

import { createSession, fetchDecision, fetchSession, textSession, updateDecisions, updateSession } from './sessions'
import { decisions, jsonPatchOperations, newSession, session, sessionId, userId } from '@test/__mocks__'
import { rest, server } from '@test/setup-server'

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
        rest.post(`${baseUrl}/sessions`, async (req, res, ctx) => {
          const body = postEndpoint(req.body)
          return res(body ? ctx.json(body) : ctx.status(400))
        })
      )
    })

    test('expect endpoint called with session', async () => {
      await createSession(newSession)
      expect(postEndpoint).toHaveBeenCalledWith(expect.objectContaining(newSession))
    })

    test('expect result from call returned', async () => {
      const expectedResult = { id: 'aeiou' }
      postEndpoint.mockReturnValue(expectedResult)

      const result = await createSession(newSession)
      expect(postEndpoint).toHaveBeenCalledTimes(1)
      expect(result).toEqual(expectedResult)
    })
  })

  describe('fetchDecision', () => {
    beforeAll(() => {
      server.use(
        rest.get(`${baseUrl}/sessions/:id/decisions/:user`, async (req, res, ctx) => {
          const { id, user } = req.params
          if (id !== sessionId || decodeURIComponent(user) !== userId) {
            return res(ctx.status(400))
          }
          return res(ctx.json(decisions))
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
        rest.get(`${baseUrl}/sessions/:id`, async (req, res, ctx) => {
          const { id } = req.params
          if (id !== sessionId) {
            return res(ctx.status(400))
          }
          return res(ctx.json(session))
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
        rest.post(`${baseUrl}/sessions/:id/send-text/:to`, async (req, res, ctx) => {
          const { id, to } = req.params
          if (id !== sessionId || to !== encodeURIComponent(toPhoneNumber)) {
            return res(ctx.status(400))
          }
          const body = postEndpoint(req.body)
          return res(body ? ctx.json(body) : ctx.status(400))
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
        rest.patch(`${baseUrl}/sessions/:id/decisions/:user`, async (req, res, ctx) => {
          const { id, user } = req.params
          if (id !== sessionId || decodeURIComponent(user) !== userId) {
            return res(ctx.status(400))
          }
          const body = patchEndpoint(req.body)
          return res(body ? ctx.json(body) : ctx.status(400))
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
        rest.patch(`${baseUrl}/sessions/:id`, async (req, res, ctx) => {
          const { id } = req.params
          if (id !== sessionId) {
            return res(ctx.status(400))
          }
          const body = patchEndpoint(req.body)
          return res(body ? ctx.json(body) : ctx.status(400))
        })
      )
    })

    test('expect endpoint called with body', async () => {
      await updateSession(sessionId, jsonPatchOperations)
      expect(patchEndpoint).toHaveBeenCalledWith(jsonPatchOperations)
    })
  })
})
