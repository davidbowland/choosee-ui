declare global {
  namespace NodeJS {
    interface ProcessEnv {
      GATSBY_COGNITO_APP_CLIENT_ID: string
      GATSBY_COGNITO_USER_POOL_ID: string
      GATSBY_DELAY_BETWEEN_REFRESH_MS: string
      GATSBY_IDENTITY_POOL_ID: string
      GATSBY_MAPS_API_BASE_URL: string
      GATSBY_PINPOINT_ID: string
      GATSBY_SESSION_API_BASE_URL: string
    }
  }
}

export {}
