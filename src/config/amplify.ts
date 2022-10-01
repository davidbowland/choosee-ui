import { Amplify, Auth } from 'aws-amplify'
import { Analytics } from '@aws-amplify/analytics'

const appClientId = process.env.GATSBY_COGNITO_APP_CLIENT_ID
const userPoolId = process.env.GATSBY_COGNITO_USER_POOL_ID
const identityPoolId = process.env.GATSBY_IDENTITY_POOL_ID
const mapsBaseUrl = process.env.GATSBY_MAPS_API_BASE_URL
const sessionBaseUrl = process.env.GATSBY_SESSION_API_BASE_URL

// Authorization

export const mapsApiName = 'MapsAPIGateway'
export const mapsApiNameUnauthenticated = 'MapsAPIGatewayUnauthenticated'
export const sessionApiName = 'SessionAPIGateway'
export const sessionApiNameUnauthenticated = 'SessionAPIGatewayUnauthenticated'

Amplify.configure({
  API: {
    endpoints: [
      {
        custom_header: async () => ({
          Authorization: `Bearer ${(await Auth.currentSession()).getIdToken().getJwtToken()}`,
        }),
        endpoint: mapsBaseUrl,
        name: mapsApiName,
      },
      {
        endpoint: mapsBaseUrl,
        name: mapsApiNameUnauthenticated,
      },
      {
        custom_header: async () => ({
          Authorization: `Bearer ${(await Auth.currentSession()).getIdToken().getJwtToken()}`,
        }),
        endpoint: sessionBaseUrl,
        name: sessionApiName,
      },
      {
        custom_header: async () => ({
          Authorization: '',
        }),
        endpoint: sessionBaseUrl,
        name: sessionApiNameUnauthenticated,
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

Auth.configure(analyticsConfig)
