import { Authenticator } from '@aws-amplify/ui-react'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import Button from '@mui/material/Button'
import React from 'react'

import Logo from '@components/logo'
import { AuthState, CognitoUserAmplify } from '@types'

export interface ChooseeAuthenticatorProps {
  authState: AuthState
  setLoggedInUser: (user: CognitoUserAmplify | undefined) => void
  setShowLogin: (state: boolean) => void
}

const ChooseeAuthenticator = ({ authState, setLoggedInUser, setShowLogin }: ChooseeAuthenticatorProps): JSX.Element => {
  return (
    <main className="main-content">
      <section>
        <Logo />
        <Authenticator initialState={authState} loginMechanisms={['phone_number']} signUpAttributes={['name']}>
          {({ user }) => {
            setLoggedInUser(user)
            return <></>
          }}
        </Authenticator>
        <p style={{ textAlign: 'center' }}>
          <Button onClick={() => setShowLogin(false)} startIcon={<CancelOutlinedIcon />} variant="outlined">
            Cancel
          </Button>
        </p>
      </section>
    </main>
  )
}

export default ChooseeAuthenticator
