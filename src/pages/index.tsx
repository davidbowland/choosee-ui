import React, { useState } from 'react'
import Grid from '@mui/material/Grid'
import { Helmet } from 'react-helmet'

import { AuthState } from '@types'
import Authenticated from '@components/auth'
import PrivacyLink from '@components/privacy-link'
import SessionCreate from '@components/session-create'

const Index = (): JSX.Element => {
  const [authState, setAuthState] = useState<AuthState>('signIn')
  const [showLogin, setShowLogin] = useState(false)

  return (
    <main style={{ minHeight: '90vh' }}>
      <Helmet>
        <title>Choosee | dbowland.com</title>
      </Helmet>
      <Authenticated
        initialAuthState={authState}
        initialShowLogin={showLogin}
        setInitialAuthState={setAuthState}
        setInitialShowLogin={setShowLogin}
      >
        <Grid container sx={{ padding: { sm: '50px', xs: '25px 10px' } }}>
          <Grid item sx={{ m: 'auto', maxWidth: 1200, width: '100%' }}>
            <SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />
            <PrivacyLink />
          </Grid>
        </Grid>
      </Authenticated>
    </main>
  )
}

export default Index
