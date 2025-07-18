// Gatsby loader shim
global.___loader = {
  enqueue: jest.fn(),
}

// Environment variables
process.env.GATSBY_CHOOSEE_API_BASE_URL = 'http://localhost'
process.env.GATSBY_COGNITO_APP_CLIENT_ID = 'somereallylongvalue1111'
process.env.GATSBY_COGNITO_USER_POOL_ID = 'us-east_clientId'
process.env.GATSBY_DELAY_BETWEEN_REFRESH_MS = '500'
process.env.GATSBY_IDENTITY_POOL_ID = 'us-east-2:iujhgvd56yhjm98uygt'
process.env.GATSBY_RECAPTCHA_SITE_KEY = 'oiuytfghjmnbvcdsdrty'

window.URL.createObjectURL = jest.fn()
