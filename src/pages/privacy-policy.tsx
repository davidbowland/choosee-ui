import React, { useState } from 'react'
import { Helmet } from 'react-helmet'
import Paper from '@mui/material/Paper'
import { useTheme } from '@mui/material/styles'

import '@config/amplify'
import Authenticated from '@components/auth'
import { AuthState } from '@types'
import PrivacyPolicy from '@components/privacy-policy'

const PrivacyPage = (): JSX.Element => {
  const [authState, setAuthState] = useState<AuthState>('signIn')
  const [showLogin, setShowLogin] = useState(false)

  /* Required to fix an odd color issue with the Disclaimer */
  const theme = useTheme()

  return (
    <main style={{ backgroundColor: theme.palette.background.default, color: theme.palette.text.primary }}>
      <Helmet>
        <title>Privacy Policy -- choosee.dbowland.com</title>
      </Helmet>
      <Authenticated
        initialAuthState={authState}
        initialShowLogin={showLogin}
        setInitialAuthState={setAuthState}
        setInitialShowLogin={setShowLogin}
      >
        <Paper elevation={3} sx={{ margin: 'auto', maxWidth: '900px' }}>
          <PrivacyPolicy />
        </Paper>
      </Authenticated>
    </main>
  )
}

export default PrivacyPage
