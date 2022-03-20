import Container from '@mui/material/Container'
import React, { useState } from 'react'
import { Helmet } from 'react-helmet'

import Authenticated from '@components/auth'
import SessionCreate from '@components/session-create'
import { AuthState } from '@types'

import '@config/amplify'
import '@fontsource/rokkitt'
import 'normalize.css'
import '@assets/css/index.css'

const Index = (): JSX.Element => {
  const [authState, setAuthState] = useState<AuthState>('signIn')
  const [showLogin, setShowLogin] = useState(false)

  return (
    <>
      <Helmet>
        <title>Choosee | dbowland.com</title>
      </Helmet>
      <Container maxWidth="md">
        <Authenticated initialAuthState={authState} initialShowLogin={showLogin}>
          <main className="main-content" style={{ minHeight: '100vh' }}>
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
