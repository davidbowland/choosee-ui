import Paper from '@mui/material/Paper'
import React from 'react'

import '@config/amplify'
import ServerErrorMessage from '@components/server-error-message'
import Themed from '@components/themed'

const NotFound = (): JSX.Element => {
  const display404 = typeof window !== 'undefined' && window.location.pathname.match(/^\/s\/[^/]+$/) === null
  return (
    <Themed>
      <Paper elevation={3} sx={{ margin: '1em auto', maxWidth: '900px' }}>
        {display404 && (
          <div className="main-content">
            <ServerErrorMessage title="404: Not Found">
              The resource you requested is unavailable. If you feel you have reached this page in error, please contact
              the webmaster.
            </ServerErrorMessage>
          </div>
        )}
      </Paper>
    </Themed>
  )
}

export default NotFound
