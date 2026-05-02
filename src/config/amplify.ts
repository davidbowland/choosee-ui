import { Amplify } from 'aws-amplify'

const origin = process.env.NEXT_PUBLIC_ORIGIN
const baseUrl = process.env.NEXT_PUBLIC_CHOOSEE_API_BASE_URL

// API endpoint names used by services/api.ts
export const apiName = 'ChooSeeAPI'
export const apiNameUnauthenticated = 'ChooSeeAPIUnauthenticated'

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_APP_CLIENT_ID,
      loginWith: {
        oauth: {
          domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN,
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: [`${origin}/auth/callback/`],
          redirectSignOut: [`${origin}/`],
          responseType: 'code',
          providers: ['Google'],
        },
      },
    },
  },
  API: {
    REST: {
      [apiName]: {
        endpoint: baseUrl!,
        region: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID.split('_')[0],
      },
      [apiNameUnauthenticated]: {
        endpoint: baseUrl!,
        region: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID.split('_')[0],
      },
    },
  },
})
