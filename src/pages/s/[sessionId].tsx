import type { HeadFC } from 'gatsby'
import React, { useState } from 'react'

import Grid from '@mui/material/Grid'
import { useTheme } from '@mui/material/styles'

import Authenticated from '@components/auth'
import PrivacyLink from '@components/privacy-link'
import VoteSession from '@components/session'
import { AuthState } from '@types'

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
      <Authenticated
        initialAuthState={authState}
        initialShowLogin={showLogin}
        setInitialAuthState={setAuthState}
        setInitialShowLogin={setShowLogin}
      >
        <Grid container sx={{ padding: { sm: '50px', xs: '25px 10px' } }}>
          <Grid item sx={{ m: 'auto', maxWidth: 1200, width: '100%' }}>
            <VoteSession
              initialUserId={userId}
              sessionId={params.sessionId}
              setAuthState={setAuthState}
              setShowLogin={setShowLogin}
            />
            <PrivacyLink />
          </Grid>
        </Grid>
      </Authenticated>
    </main>
  )
}

export const Head: HeadFC = () => <title>Choosee | dbowland.com</title>

export default SessionPage
