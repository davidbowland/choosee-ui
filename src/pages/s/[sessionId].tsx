import Container from '@mui/material/Container'
import React, { useState } from 'react'
import { Helmet } from 'react-helmet'

import Authenticated from '@components/auth'
import Session from '@components/session'
import { AuthState } from '@types'

import '@config/amplify'
import '@fontsource/rokkitt'
import 'normalize.css'
import '@assets/css/index.css'

export interface SessionPageProps {
  params: {
    sessionId: string
  }
}

const SessionPage = ({ params }: SessionPageProps): JSX.Element => {
  // This funky next line gets us to 100% test coverage (no difficult-to-test ternary where window needs to be undefined)
  const userId = (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('u')) || undefined

  const [authState, setAuthState] = useState<AuthState>('signIn')
  const [showLogin, setShowLogin] = useState(false)

  return (
    <Container maxWidth="md">
      <Helmet>
        <title>Choosee | dbowland.com</title>
      </Helmet>
      <Authenticated
        initialAuthState={authState}
        initialShowLogin={showLogin}
        setInitialAuthState={setAuthState}
        setInitialShowLogin={setShowLogin}
      >
        <main className="main-content" style={{ minHeight: '100vh' }}>
          <section>
            <Session
              initialUserId={userId}
              sessionId={params.sessionId}
              setAuthState={setAuthState}
              setShowLogin={setShowLogin}
            />
          </section>
        </main>
      </Authenticated>
    </Container>
  )
}

export default SessionPage
