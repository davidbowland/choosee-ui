import type { HeadFC } from 'gatsby'
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

export const Head: HeadFC = () => <title>400: Bad Request | dbowland.com</title>

export default BadRequest
