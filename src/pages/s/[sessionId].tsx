import React, { useState } from 'react'
import { Helmet } from 'react-helmet'

import { AuthState } from '@types'
import Authenticated from '@components/auth'
import VoteSession from '@components/session'

export interface SessionPageProps {
  params: {
    sessionId: string
  }
}

const SessionPage = ({ params }: SessionPageProps): JSX.Element => {
  // This funky next line gets us to 100% test coverage (no difficult-to-test ternary where window needs to be undefined)
  const userId = (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('u')) || undefined

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
          <VoteSession
            initialUserId={userId}
            sessionId={params.sessionId}
            setAuthState={setAuthState}
            setShowLogin={setShowLogin}
          />
        </section>
      </Authenticated>
    </main>
  )
}

export default SessionPage
