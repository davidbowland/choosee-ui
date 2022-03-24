import DoneAllIcon from '@mui/icons-material/DoneAll'
import FollowTheSignsOutlinedIcon from '@mui/icons-material/FollowTheSignsOutlined'
import Button from '@mui/material/Button'
import LoginIcon from '@mui/icons-material/Login'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import React, { useState } from 'react'

import Logo from '@components/logo'
import { AuthState, CognitoUserAmplify } from '@types'

export interface LoginPromptProps {
  initialUserId?: string
  setAuthState: (state: AuthState) => void
  setLoggedInUser: (user: CognitoUserAmplify) => void
  setShowLogin: (state: boolean) => void
}

const LoginPrompt = ({ initialUserId, setAuthState, setLoggedInUser, setShowLogin }: LoginPromptProps): JSX.Element => {
  const [userId, setUserId] = useState(initialUserId ?? '+1')
  const [userIdError, setUserIdError] = useState<string | undefined>(undefined)

  const chooseClick = () => {
    if (userId.match(/\+1\d{10}/) === null) {
      setUserIdError('Invalid phone number. Be sure to include area code.')
      return
    }
    setUserIdError(undefined)

    setLoggedInUser(({ attributes: { phone_number: userId } } as unknown) as CognitoUserAmplify)
  }

  const onUserIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const sanitizedPhone = event.target.value.replace(/\D/g, '')
    const phoneWithCountry = sanitizedPhone.replace(/^\+?1?/, '+1')
    const trimmedPhone = phoneWithCountry.substring(0, 12)
    setUserId(trimmedPhone)
  }

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
      <Typography variant="h6">Enter your phone number to vote</Typography>
      <div>
        <label>
          <TextField
            aria-readonly="true"
            autoComplete="tel"
            error={userIdError !== undefined}
            fullWidth
            helperText={userIdError}
            label="Your phone number"
            placeholder="+10000000000"
            name="phone_number"
            onChange={onUserIdChange}
            type="tel"
            value={userId}
            variant="filled"
          />
        </label>
      </div>
      <br />
      <Button
        data-amplify-analytics-name="lets-choose-click"
        data-amplify-analytics-on="click"
        fullWidth
        onClick={chooseClick}
        startIcon={<DoneAllIcon />}
        variant="contained"
      >
        Let&apos;s choose!
      </Button>
      <Typography sx={{ margin: '0.5em auto', textAlign: 'center' }} variant="h6">
        -- or --
      </Typography>
      <Button
        data-amplify-analytics-name="sign-up-click"
        data-amplify-analytics-on="click"
        fullWidth
        onClick={signUpClick}
        startIcon={<FollowTheSignsOutlinedIcon />}
        variant="contained"
      >
        Sign up
      </Button>
      <Typography sx={{ margin: '0.5em auto', textAlign: 'center' }} variant="h6">
        -- or --
      </Typography>
      <Button fullWidth onClick={signInClick} startIcon={<LoginIcon />} variant="contained">
        Sign in
      </Button>
    </>
  )
}

export default LoginPrompt
