import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import React from 'react'
import Typography from '@mui/material/Typography'
import { navigate } from 'gatsby'

import Logo from '@components/logo'

const Expired = (): JSX.Element => {
  return (
    <>
      <Logo />
      <Alert severity="error">Session expired</Alert>
      <br />
      <Typography sx={{ textAlign: 'center' }} variant="h6">
        The Choosee session you are trying to access is missing or has expired.
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

export default Expired
