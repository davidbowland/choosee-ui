declare global {
  namespace NodeJS {
    interface ProcessEnv {
      GATSBY_CHOOSEE_API_BASE_URL: string
      GATSBY_COGNITO_APP_CLIENT_ID: string
      GATSBY_COGNITO_USER_POOL_ID: string
      GATSBY_DELAY_BETWEEN_REFRESH_MS: string
      GATSBY_IDENTITY_POOL_ID: string
      GATSBY_RECAPTCHA_SITE_KEY: string
    }
  }
}

export {}
