import Container from '@mui/material/Container'
import React from 'react'
import { Helmet } from 'react-helmet'

import Session, { SessionProps } from '@components/session'

import '@config/amplify'
import '@fontsource/rokkitt'
import 'normalize.css'
import '@assets/css/index.css'

export interface SessionPageProps {
  params: SessionProps
}

const SessionPage = ({ params }: SessionPageProps): JSX.Element => {
  return (
    <Container maxWidth="md">
      <main className="main-content">
        <Helmet>
          <title>Choosee | dbowland.com</title>
        </Helmet>
        <Session sessionId={params.sessionId} />
      </main>
    </Container>
  )
}

export default SessionPage
