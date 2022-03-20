import Container from '@mui/material/Container'
import React from 'react'

import '@config/amplify'
import ServerErrorMessage from '@components/server-error-message'

const BadRequest = (): JSX.Element => {
  return (
    <Container className="main-content" maxWidth="md">
      <ServerErrorMessage title="400: Bad Request">
        Your request was malformed or otherwise could not be understood by the server. Please modify your request before
        retrying.
      </ServerErrorMessage>
    </Container>
  )
}

export default BadRequest
