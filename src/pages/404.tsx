import Container from '@mui/material/Container'
import React from 'react'

import '@config/amplify'
import ServerErrorMessage from '@components/server-error-message'

const NotFound = (): JSX.Element => {
  const display404 = typeof window !== 'undefined' && window.location.pathname.match(/^\/s\/[^/]+$/) === null
  return (
    <Container maxWidth="md">
      {display404 && (
        <div className="main-content">
          <ServerErrorMessage title="404: Not Found">
            The resource you requested is unavailable. If you feel you have reached this page in error, please contact
            the webmaster.
          </ServerErrorMessage>
        </div>
      )}
    </Container>
  )
}

export default NotFound
