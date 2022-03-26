import { Amplify, Auth } from 'aws-amplify'
import { Analytics } from '@aws-amplify/analytics'

const appClientId = process.env.GATSBY_COGNITO_APP_CLIENT_ID
const userPoolId = process.env.GATSBY_COGNITO_USER_POOL_ID
const identityPoolId = process.env.GATSBY_IDENTITY_POOL_ID
const baseUrl = process.env.GATSBY_CHOOSEE_API_BASE_URL

// Authorization

export const apiName = 'ChooseeAPIGateway'
export const apiNameUnauthenticated = 'ChooseeAPIGatewayUnauthenticated'

Amplify.configure({
  API: {
    endpoints: [
      {
        custom_header: async () => ({
          Authorization: `Bearer ${(await Auth.currentSession()).getIdToken().getJwtToken()}`,
        }),
        endpoint: baseUrl,
        name: apiName,
      },
      {
        custom_header: async () => ({
          Authorization: '',
        }),
        endpoint: baseUrl,
        name: apiNameUnauthenticated,
      },
    ],
  },
  Auth: {
    identityPoolId,
    mandatorySignIn: false,
    region: userPoolId.split('_')[0],
    userPoolId,
    userPoolWebClientId: appClientId,
  },
})

// Analytics

const appId = process.env.GATSBY_PINPOINT_ID

const analyticsConfig = {
  AWSPinpoint: {
    appId,
    mandatorySignIn: false,
    region: 'us-east-1',
  },
}

Analytics.configure(analyticsConfig)

Analytics.autoTrack('session', {
  // REQUIRED, turn on/off the auto tracking
  enable: true,
})

Analytics.autoTrack('pageView', {
  // REQUIRED, turn on/off the auto tracking
  enable: true,
})

Analytics.autoTrack('event', {
  // REQUIRED, turn on/off the auto tracking
  enable: true,
})
