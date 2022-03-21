import FollowTheSignsIcon from '@mui/icons-material/FollowTheSigns'
import LoginIcon from '@mui/icons-material/Login'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import React from 'react'

import Logo from '@components/logo'
import { FloatingFab } from './elements'
import { AuthState } from '@types'

export interface SessionCreateProps {
  setAuthState: (state: AuthState) => void
  setShowLogin: (state: boolean) => void
}

const SignUpCta = ({ setAuthState, setShowLogin }: SessionCreateProps): JSX.Element => {
  const signInClick = () => {
    setAuthState('signIn')
    setShowLogin(true)
  }

  const signUpClick = () => {
    setAuthState('signUp')
    setShowLogin(true)
  }

  return (
    <>
      <Logo />
      <br />
      <Typography sx={{ textAlign: 'center' }} variant="h6">
        Vote on where you want to eat tonight. Share a link for others to vote with you. Sign up or sign in to get
        started.
      </Typography>
      <br />
      <div>
        <Button
          data-amplify-analytics-name="sign-up-click"
          data-amplify-analytics-on="click"
          fullWidth
          onClick={signUpClick}
          startIcon={<FollowTheSignsIcon />}
          variant="contained"
        >
          Sign up
        </Button>
      </div>
      <br />
      <Typography>
        A free account is required to keep our costs low. We don&apos;t sell your information and deleting your account
        is easy.
      </Typography>
      <p style={{ height: '100px' }}>
        <FloatingFab aria-label="sign in" color="primary" onClick={signInClick}>
          <LoginIcon />
        </FloatingFab>
      </p>
    </>
  )
}

export default SignUpCta
