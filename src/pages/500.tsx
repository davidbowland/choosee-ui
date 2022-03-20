import Container from '@mui/material/Container'
import React from 'react'

import '@config/amplify'
import ServerErrorMessage from '@components/server-error-message'

const InternalServerError = (): JSX.Element => {
  return (
    <Container className="main-content" maxWidth="md">
      <ServerErrorMessage title="500: Internal Server Error">
        An internal server error has occurred trying to serve your request. If you continue to experience this error,
        please contact the webmaster.
      </ServerErrorMessage>
    </Container>
  )
}

export default InternalServerError
