import Paper from '@mui/material/Paper'
import React from 'react'

import '@config/amplify'
import ServerErrorMessage from '@components/server-error-message'
import Themed from '@components/themed'

const Forbidden = (): JSX.Element => {
  return (
    <Themed>
      <Paper elevation={3} sx={{ margin: '1em auto', maxWidth: '900px' }}>
        <ServerErrorMessage title="403: Forbidden">
          You are not allowed to access the resource you requested. If you feel you have reached this page in error,
          please contact the webmaster.
        </ServerErrorMessage>
      </Paper>
    </Themed>
  )
}

export default Forbidden
