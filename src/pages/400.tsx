import Paper from '@mui/material/Paper'
import React from 'react'

import '@config/amplify'
import ServerErrorMessage from '@components/server-error-message'
import Themed from '@components/themed'

const BadRequest = (): JSX.Element => {
  return (
    <Themed>
      <Paper elevation={3} sx={{ margin: '1em auto', maxWidth: '900px' }}>
        <ServerErrorMessage title="400: Bad Request">
          Your request was malformed or otherwise could not be understood by the server. Please modify your request
          before retrying.
        </ServerErrorMessage>
      </Paper>
    </Themed>
  )
}

export default BadRequest
