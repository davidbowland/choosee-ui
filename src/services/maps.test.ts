import { Auth } from 'aws-amplify'
import { CognitoUserSession } from 'amazon-cognito-identity-js'

import { choiceId, choices, recaptchaToken } from '@test/__mocks__'
import { fetchAddress, fetchAddressAuthenticated, fetchChoices } from './maps'
import { http, HttpResponse, server } from '@test/setup-server'

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
        http.get(`${baseUrl}/reverse-geocode`, async ({ request }) => {
          const url = new URL(request.url)
          const lat = url.searchParams.get('lat')
          const lng = url.searchParams.get('lng')
          if (lat !== `${coords.lat}` || lng !== `${coords.lng}`) {
            return new HttpResponse(JSON.stringify({ error: 'Invalid coordinates' }), {
              status: 400,
            })
          }
          if (request.headers.get('x-recaptcha-token') !== recaptchaToken) {
            return new HttpResponse(JSON.stringify({ error: 'Invalid recaptcha token' }), {
              status: 401,
            })
          }
          return HttpResponse.json({ address })
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
        http.get(`${baseUrl}/reverse-geocode/authed`, async ({ request }) => {
          const url = new URL(request.url)
          const lat = url.searchParams.get('lat')
          const lng = url.searchParams.get('lng')
          if (lat !== `${coords.lat}` || lng !== `${coords.lng}`) {
            return new HttpResponse(JSON.stringify({ error: 'Invalid coordinates' }), {
              status: 400,
            })
          }
          return HttpResponse.json({ address })
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
        http.get(`${baseUrl}/choices/:id`, async ({ params }) => {
          const { id } = params
          if (id !== choiceId) {
            return new HttpResponse(JSON.stringify({ error: 'Invalid choice id' }), {
              status: 400,
            })
          }
          return HttpResponse.json({ choices })
        })
      )
    })

    test('expect results from returned on fetch', async () => {
      const result = await fetchChoices(choiceId)
      expect(result).toEqual(choices)
    })
  })
})
