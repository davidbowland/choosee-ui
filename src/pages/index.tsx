import React, { useState } from 'react'
import Container from '@mui/material/Container'
import { Helmet } from 'react-helmet'

import '@config/amplify'
import { AuthState } from '@types'
import Authenticated from '@components/auth'
import SessionCreate from '@components/session-create'

import '@assets/css/index.css'
import '@fontsource/rokkitt'
import 'normalize.css'

const Index = (): JSX.Element => {
  const [authState, setAuthState] = useState<AuthState>('signIn')
  const [showLogin, setShowLogin] = useState(false)

  return (
    <>
      <Helmet>
        <title>Choosee | dbowland.com</title>
      </Helmet>
      <Container maxWidth="md">
        <Authenticated
          initialAuthState={authState}
          initialShowLogin={showLogin}
          setInitialAuthState={setAuthState}
          setInitialShowLogin={setShowLogin}
        >
          <main className="main-content" style={{ minHeight: '90vh' }}>
            <section>
              <SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />
            </section>
          </main>
        </Authenticated>
      </Container>
    </>
  )
}

export default Index
