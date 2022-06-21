import React, { useState } from 'react'
import { Helmet } from 'react-helmet'

import { AuthState } from '@types'
import Authenticated from '@components/auth'
import SessionCreate from '@components/session-create'

const Index = (): JSX.Element => {
  const [authState, setAuthState] = useState<AuthState>('signIn')
  const [showLogin, setShowLogin] = useState(false)

  return (
    <main style={{ minHeight: '90vh' }}>
      <Helmet>
        <title>Choosee | dbowland.com</title>
      </Helmet>
      <Authenticated
        initialAuthState={authState}
        initialShowLogin={showLogin}
        setInitialAuthState={setAuthState}
        setInitialShowLogin={setShowLogin}
      >
        <section style={{ padding: '50px' }}>
          <SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />
        </section>
      </Authenticated>
    </main>
  )
}

export default Index
