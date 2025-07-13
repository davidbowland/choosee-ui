import { Amplify, Auth } from 'aws-amplify'

const appClientId = process.env.GATSBY_COGNITO_APP_CLIENT_ID
const userPoolId = process.env.GATSBY_COGNITO_USER_POOL_ID
const identityPoolId = process.env.GATSBY_IDENTITY_POOL_ID

const chooseeBaseUrl = process.env.GATSBY_CHOOSEE_API_BASE_URL

// Authorization

export const chooseeApiName = 'ChooseeAPIGateway'
export const chooseeApiNameUnauthenticated = 'ChooseeAPIGatewayUnauthenticated'

Amplify.configure({
  API: {
    endpoints: [
      {
        custom_header: async () => ({
          Authorization: `Bearer ${(await Auth.currentSession()).getIdToken().getJwtToken()}`,
        }),
        endpoint: chooseeBaseUrl,
        name: chooseeApiName,
      },
      {
        endpoint: chooseeBaseUrl,
        name: chooseeApiNameUnauthenticated,
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
