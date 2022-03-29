import React, { useState } from 'react'
import { Helmet } from 'react-helmet'
import Paper from '@mui/material/Paper'

import '@config/amplify'
import { AuthState } from '@types'
import Authenticated from '@components/auth'
import SessionCreate from '@components/session-create'
import Themed from '@components/themed'

import '@assets/css/index.css'
import '@fontsource/rokkitt'
import 'normalize.css'

const Index = (): JSX.Element => {
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
              <SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />
            </section>
          </main>
        </Authenticated>
      </Paper>
    </Themed>
  )
}

export default Index
