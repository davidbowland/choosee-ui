import { Auth } from 'aws-amplify'
import React, { useEffect, useState } from 'react'

import Create from './create'
import SignUpCta from '@components/sign-up-cta'
import { AuthState } from '@types'

export interface SessionCreateProps {
  setAuthState: (state: AuthState) => void
  setShowLogin: (state: boolean) => void
}

const SessionCreate = ({ setAuthState, setShowLogin }: SessionCreateProps): JSX.Element => {
  const [createVisible, setCreateVisible] = useState(false)

  useEffect(() => {
    Auth.currentAuthenticatedUser()
      .then(() => setCreateVisible(true))
      .catch(() => null)
  }, [])

  return <>{createVisible ? <Create /> : <SignUpCta setAuthState={setAuthState} setShowLogin={setShowLogin} />}</>
}

export default SessionCreate
