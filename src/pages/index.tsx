import React, { useState } from 'react'
import Grid from '@mui/material/Grid'
import { Helmet } from 'react-helmet'
import { useTheme } from '@mui/material/styles'

import Authenticated from '@components/auth'
import { AuthState } from '@types'
import PrivacyLink from '@components/privacy-link'
import SessionCreate from '@components/session-create'

const Index = (): JSX.Element => {
  const [authState, setAuthState] = useState<AuthState>('signIn')
  const [showLogin, setShowLogin] = useState(false)

  /* Required to fix an odd color issue with the Disclaimer */
  const theme = useTheme()

  return (
    <main
      style={{
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
        minHeight: '100vh',
      }}
    >
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
