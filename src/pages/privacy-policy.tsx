import type { HeadFC } from 'gatsby'
import React, { useState } from 'react'

import Paper from '@mui/material/Paper'
import { useTheme } from '@mui/material/styles'

import Authenticated from '@components/auth'
import PrivacyPolicy from '@components/privacy-policy'
import '@config/amplify'
import { AuthState } from '@types'

const PrivacyPage = (): JSX.Element => {
  const [authState, setAuthState] = useState<AuthState>('signIn')
  const [showLogin, setShowLogin] = useState(false)

  /* Required to fix an odd color issue with the Disclaimer */
  const theme = useTheme()

  return (
    <main style={{ backgroundColor: theme.palette.background.default, color: theme.palette.text.primary }}>
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

export const Head: HeadFC = () => <title>Privacy Policy | dbowland.com</title>

export default PrivacyPage
