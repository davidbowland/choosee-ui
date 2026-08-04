import { Amplify } from 'aws-amplify'

const baseUrl = process.env.NEXT_PUBLIC_CHOOSEE_API_BASE_URL

// API endpoint name used by services/api.ts
export const apiNameUnauthenticated = 'ChooseeAPIUnauthenticated'

Amplify.configure({
  API: {
    REST: {
      // No `region` here: Amplify only uses it to SigV4-sign requests under the 'iam' auth
      // mode, and every Choosee endpoint is unauthenticated. It used to be derived from the
      // Cognito user pool id, which no longer exists.
      [apiNameUnauthenticated]: {
        endpoint: baseUrl!,
      },
    },
  },
})
