import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import React from 'react'
import Typography from '@mui/material/Typography'
import { navigate } from 'gatsby'

import Logo from '@components/logo'

const Finished = (): JSX.Element => {
  return (
    <>
      <Logo />
      <Alert severity="error">Choices exhausted</Alert>
      <br />
      <Typography sx={{ textAlign: 'center' }} variant="h6">
        All choices have been exhausted. You might be just a little too Choosee!
      </Typography>
      <br />
      <Button
        data-amplify-analytics-name="new-choices-click"
        data-amplify-analytics-on="click"
        fullWidth
        onClick={() => navigate('/')}
        variant="contained"
      >
        Make new choices
      </Button>
    </>
  )
}

export default Finished
