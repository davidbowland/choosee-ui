import React, { useState } from 'react'

import DoneAllIcon from '@mui/icons-material/DoneAll'
import FollowTheSignsOutlinedIcon from '@mui/icons-material/FollowTheSignsOutlined'
import LoginIcon from '@mui/icons-material/Login'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { AmplifyUser, AuthState } from '@types'

export interface LoginPromptProps {
  initialUserId?: string
  setAuthState: (state: AuthState) => void
  setLoggedInUser: (user: AmplifyUser) => void
  setShowLogin: (state: boolean) => void
}

const LoginPrompt = ({ initialUserId, setAuthState, setLoggedInUser, setShowLogin }: LoginPromptProps): JSX.Element => {
  const [userId, setUserId] = useState(initialUserId ?? '+1')
  const [userIdError, setUserIdError] = useState<string | undefined>()

  const chooseClick = (): void => {
    if (userId.match(/^\+1[2-9]\d{9}$/) === null) {
      setUserIdError('Invalid phone number. Be sure to include area code.')
      return
    }
    setUserIdError(undefined)

    setLoggedInUser({ attributes: { phone_number: userId } } as unknown as AmplifyUser)
  }

  const onUserIdChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const sanitizedPhone = event.target.value.replace(/\D/g, '')
    const phoneWithCountry = sanitizedPhone.replace(/^\+?1?([2-9]\d+)/, '+1$1')
    const trimmedPhone = phoneWithCountry.substring(0, 12)
    setUserId(trimmedPhone)
  }

  const signInClick = (): void => {
    setAuthState('signIn')
    setShowLogin(true)
  }

  const signUpClick = (): void => {
    setAuthState('signUp')
    setShowLogin(true)
  }

  return (
    <Stack margin="auto" maxWidth="400px" spacing={2}>
      <Typography variant="h6">Enter your phone number to vote</Typography>
      <Typography variant="caption">
        Your phone number is only used to track your vote. We won&apos;t use it to contact you or sell your information.
      </Typography>
      <label>
        <TextField
          aria-readonly="true"
          autoComplete="tel"
          error={userIdError !== undefined}
          fullWidth
          helperText={userIdError}
          label="Your phone number"
          name="phone_number"
          onChange={onUserIdChange}
          onKeyUp={(event: React.KeyboardEvent) => {
            if (event.key === 'Enter') {
              chooseClick()
            }
          }}
          placeholder="+10000000000"
          type="tel"
          value={userId}
          variant="filled"
        />
      </label>
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
      <Typography sx={{ textAlign: 'center' }} variant="h6">
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
      <Typography sx={{ textAlign: 'center' }} variant="h6">
        -- or --
      </Typography>
      <Button fullWidth onClick={signInClick} startIcon={<LoginIcon />} variant="contained">
        Sign in
      </Button>
    </Stack>
  )
}

export default LoginPrompt
