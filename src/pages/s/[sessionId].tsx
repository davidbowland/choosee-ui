import React, { useState } from 'react'
import { Helmet } from 'react-helmet'
import Paper from '@mui/material/Paper'

import '@config/amplify'
import { AuthState } from '@types'
import Authenticated from '@components/auth'
import Session from '@components/session'
import Themed from '@components/themed'

import '@assets/css/index.css'
import '@fontsource/rokkitt'

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
    <Themed>
      <Helmet>
        <title>Choosee | dbowland.com</title>
      </Helmet>
      <Paper elevation={3} sx={{ margin: 'auto', maxWidth: '900px' }}>
        <Authenticated
          initialAuthState={authState}
          initialShowLogin={showLogin}
          setInitialAuthState={setAuthState}
          setInitialShowLogin={setShowLogin}
        >
          <main className="main-content" style={{ minHeight: '90vh' }}>
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
      </Paper>
    </Themed>
  )
}

export default SessionPage
