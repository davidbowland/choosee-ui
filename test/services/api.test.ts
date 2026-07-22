import { get, post } from 'aws-amplify/api'

import { fetchProfile, registerPhone, verifyPhone } from '@services/api'

jest.mock('aws-amplify/api')
jest.mock('aws-amplify/auth', () => ({
  fetchAuthSession: jest.fn().mockResolvedValue({ tokens: { idToken: { toString: () => 'jwt-token' } } }),
}))

const mockResponse = (value: unknown) => ({
  response: Promise.resolve({ body: { json: () => Promise.resolve(value) } }),
})

describe('profile api', () => {
  beforeAll(() => {
    jest.mocked(get).mockReturnValue(mockResponse({ verified: false, phoneLast4: null, consent: false }) as never)
    jest.mocked(post).mockReturnValue(mockResponse({ verified: false, phoneLast4: '4567', consent: true }) as never)
  })

  it('fetchProfile GETs /profile on the authenticated endpoint with a bearer token', async () => {
    const result = await fetchProfile()
    expect(get).toHaveBeenCalledWith(
      expect.objectContaining({
        apiName: 'ChooseeAPI',
        path: '/profile',
        options: expect.objectContaining({ headers: { Authorization: 'Bearer jwt-token' } }),
      }),
    )
    expect(result).toEqual({ verified: false, phoneLast4: null, consent: false })
  })

  it('registerPhone POSTs phone + consent to /profile/phone', async () => {
    await registerPhone('+15551234567', true)
    expect(post).toHaveBeenCalledWith(
      expect.objectContaining({
        apiName: 'ChooseeAPI',
        path: '/profile/phone',
        options: expect.objectContaining({ body: { phone: '+15551234567', consent: true } }),
      }),
    )
  })

  it('verifyPhone POSTs the pin to /profile/phone/verify', async () => {
    jest.mocked(post).mockReturnValueOnce(mockResponse({ verified: true, locked: false }) as never)
    const result = await verifyPhone('123456')
    expect(post).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/profile/phone/verify',
        options: expect.objectContaining({ body: { pin: '123456' } }),
      }),
    )
    expect(result).toEqual({ verified: true, locked: false })
  })
})
