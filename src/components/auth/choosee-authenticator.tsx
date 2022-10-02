import { Authenticator, ThemeProvider, defaultDarkModeOverride } from '@aws-amplify/ui-react'
import Button from '@mui/material/Button'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import React from 'react'
import Stack from '@mui/material/Stack'

import { AmplifyUser, AuthState } from '@types'

export interface ChooseeAuthenticatorProps {
  authState: AuthState
  setLoggedInUser: (user: AmplifyUser | undefined) => void
  setShowLogin: (state: boolean) => void
}

const ChooseeAuthenticator = ({ authState, setLoggedInUser, setShowLogin }: ChooseeAuthenticatorProps): JSX.Element => {
  const theme = {
    name: 'dark-mode-theme',
    overrides: [defaultDarkModeOverride],
  }

  return (
    <section style={{ padding: '50px' }}>
      <ThemeProvider colorMode="system" theme={theme}>
        <Stack margin="auto" spacing={2}>
          <Authenticator initialState={authState} loginMechanisms={['phone_number']} signUpAttributes={['name']}>
            {({ user }) => {
              setLoggedInUser(user)
              return <></>
            }}
          </Authenticator>
          <div style={{ textAlign: 'center' }}>
            <Button onClick={() => setShowLogin(false)} startIcon={<CancelOutlinedIcon />} variant="outlined">
              Cancel
            </Button>
          </div>
        </Stack>
      </ThemeProvider>
    </section>
  )
}

export default ChooseeAuthenticator
