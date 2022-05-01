import React from 'react'

import Authenticated from '@components/auth'
import ServerErrorMessage from '@components/server-error-message'

const BadRequest = (): JSX.Element => {
  return (
    <Authenticated initialAuthState="signIn" initialShowLogin={false}>
      <ServerErrorMessage title="400: Bad Request">
        Your request was malformed or otherwise could not be understood by the server. Please modify your request before
        retrying.
      </ServerErrorMessage>
    </Authenticated>
  )
}

export default BadRequest
