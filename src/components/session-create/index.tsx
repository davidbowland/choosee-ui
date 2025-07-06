import SignUpCta from '@components/sign-up-cta'
import { Auth } from 'aws-amplify'
import React, { useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'

import Create from './create'
import { AuthState } from '@types'

export interface SessionCreateProps {
  setAuthState: (state: AuthState) => void
  setShowLogin: (state: boolean) => void
}

const SessionCreate = ({ setAuthState, setShowLogin }: SessionCreateProps): JSX.Element => {
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    Auth.currentAuthenticatedUser()
      .then(() => setLoggedIn(true))
      .catch(() => {
        setLoggedIn(false)

        const script = document.createElement('script')
        script.src = `https://www.google.com/recaptcha/api.js?render=${process.env.GATSBY_RECAPTCHA_SITE_KEY}`
        script.async = true
        document.body.appendChild(script)
      })
  }, [])

  return (
    <Stack spacing={4}>
      <Box>
        <Create loggedIn={loggedIn} />
      </Box>
      <Box>
        {!loggedIn && (
          <>
            <Divider />
            <SignUpCta setAuthState={setAuthState} setShowLogin={setShowLogin} />
          </>
        )}
      </Box>
    </Stack>
  )
}

export default SessionCreate
