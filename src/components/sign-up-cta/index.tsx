import Button from '@mui/material/Button'
import Fab from '@mui/material/Fab'
import FollowTheSignsIcon from '@mui/icons-material/FollowTheSigns'
import LoginIcon from '@mui/icons-material/Login'
import React from 'react'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { AuthState } from '@types'
import Logo from '@components/logo'

export interface SignUpCtaProps {
  setAuthState: (state: AuthState) => void
  setShowLogin: (state: boolean) => void
}

const SignUpCta = ({ setAuthState, setShowLogin }: SignUpCtaProps): JSX.Element => {
  const signInClick = (): void => {
    setAuthState('signIn')
    setShowLogin(true)
  }

  const signUpClick = (): void => {
    setAuthState('signUp')
    setShowLogin(true)
  }

  return (
    <>
      <Logo />
      <Stack margin="auto" maxWidth="400px" spacing={2}>
        <Typography sx={{ textAlign: 'center' }} variant="h6">
          Vote on where you want to eat. Share a link for others to vote with you. Sign up or sign in to get started.
        </Typography>
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
        <Typography>
          A free account is required to keep our costs low. We don&apos;t sell your information and deleting your
          account is easy.
        </Typography>
        <div style={{ height: '100px' }}>
          <Fab
            aria-label="sign in"
            color="primary"
            onClick={signInClick}
            sx={{
              bottom: 20,
              left: 'auto',
              margin: 0,
              position: 'fixed',
              right: 20,
              top: 'auto',
            }}
          >
            <LoginIcon />
          </Fab>
        </div>
      </Stack>
    </>
  )
}

export default SignUpCta
