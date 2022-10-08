import { Auth } from 'aws-amplify'
import { CognitoUserSession } from 'amazon-cognito-identity-js'

import { choiceId, choices, recaptchaToken } from '@test/__mocks__'
import { fetchAddress, fetchAddressAuthenticated, fetchChoices } from './maps'
import { rest, server } from '@test/setup-server'

const baseUrl = process.env.GATSBY_MAPS_API_BASE_URL
jest.mock('@aws-amplify/analytics')

describe('Maps service', () => {
  beforeAll(() => {
    const userSession = { getIdToken: () => ({ getJwtToken: () => '' }) } as CognitoUserSession
    jest.spyOn(Auth, 'currentSession').mockResolvedValue(userSession)
  })

  describe('fetchAddress', () => {
    const address = '90210'
    const coords = {
      lat: 38.897957,
      lng: -77.03656,
    }

    beforeAll(() => {
      server.use(
        rest.get(`${baseUrl}/reverse-geocode`, async (req, res, ctx) => {
          const lat = req.url.searchParams.get('lat')
          const lng = req.url.searchParams.get('lng')
          if (lat !== `${coords.lat}` || lng !== `${coords.lng}`) {
            return res(ctx.status(400))
          }
          if (req.headers.get('x-recaptcha-token') !== recaptchaToken) {
            return res(ctx.status(401))
          }
          return res(ctx.json({ address }))
        })
      )
    })

    test('expect results from returned on fetch', async () => {
      const result = await fetchAddress(coords.lat, coords.lng, recaptchaToken)
      expect(result).toEqual({ address })
    })
  })

  describe('fetchAddressAuthenticated', () => {
    const address = '90210'
    const coords = {
      lat: 38.897957,
      lng: -77.03656,
    }

    beforeAll(() => {
      server.use(
        rest.get(`${baseUrl}/reverse-geocode/authed`, async (req, res, ctx) => {
          const lat = req.url.searchParams.get('lat')
          const lng = req.url.searchParams.get('lng')
          if (lat !== `${coords.lat}` || lng !== `${coords.lng}`) {
            return res(ctx.status(400))
          }
          return res(ctx.json({ address }))
        })
      )
    })

    test('expect results from returned on fetch', async () => {
      const result = await fetchAddressAuthenticated(coords.lat, coords.lng)
      expect(result).toEqual({ address })
    })
  })

  describe('fetchChoices', () => {
    beforeAll(() => {
      server.use(
        rest.get(`${baseUrl}/choices/:id`, async (req, res, ctx) => {
          const { id } = req.params
          if (id !== choiceId) {
            return res(ctx.status(400))
          }
          return res(ctx.json({ choices }))
        })
      )
    })

    test('expect results from returned on fetch', async () => {
      const result = await fetchChoices(choiceId)
      expect(result).toEqual(choices)
    })
  })
})
