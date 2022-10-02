import React, { useState } from 'react'
import { Helmet } from 'react-helmet'
import Paper from '@mui/material/Paper'

import '@config/amplify'
import { AuthState } from '@types'
import Authenticated from '@components/auth'
import PrivacyPolicy from '@components/privacy-policy'

const PrivacyPage = (): JSX.Element => {
  const [authState, setAuthState] = useState<AuthState>('signIn')
  const [showLogin, setShowLogin] = useState(false)

  return (
    <>
      <Helmet>
        <title>Privacy Policy -- choosee.dbowland.com</title>
      </Helmet>
      <main>
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
    </>
  )
}

export default PrivacyPage
