import React from 'react'

import Authenticated from '@components/auth'
import ServerErrorMessage from '@components/server-error-message'

const NotFound = (): JSX.Element => {
  const display404 = typeof window !== 'undefined' && window.location.pathname.match(/^\/s\/[^/]+$/) === null

  if (display404) {
    return (
      <Authenticated initialAuthState="signIn" initialShowLogin={false}>
        <div className="main-content">
          <ServerErrorMessage title="404: Not Found">
            The resource you requested is unavailable. If you feel you have reached this page in error, please contact
            the webmaster.
          </ServerErrorMessage>
        </div>
      </Authenticated>
    )
  }
  return <></>
}

export default NotFound
