import React, { useEffect, useState } from 'react'
import { Auth } from 'aws-amplify'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'

import { AuthState } from '@types'
import Create from './create'
import SignUpCta from '@components/sign-up-cta'

export interface SessionCreateProps {
  setAuthState: (state: AuthState) => void
  setShowLogin: (state: boolean) => void
}

const SessionCreate = ({ setAuthState, setShowLogin }: SessionCreateProps): JSX.Element => {
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    Auth.currentAuthenticatedUser()
      .then(() => setLoggedIn(true))
      .catch(() => setLoggedIn(false))

    const script = document.createElement('script')
    script.src = `https://www.google.com/recaptcha/api.js?render=${process.env.GATSBY_RECAPTCHA_SITE_KEY}`
    script.async = true
    document.body.appendChild(script)
  }, [])

  return (
    <Stack spacing={4}>
      <Create loggedIn={loggedIn} />
      {!loggedIn && (
        <>
          <Divider />
          <SignUpCta setAuthState={setAuthState} setShowLogin={setShowLogin} />
        </>
      )}
    </Stack>
  )
}

export default SessionCreate
