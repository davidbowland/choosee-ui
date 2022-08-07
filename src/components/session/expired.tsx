import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import React from 'react'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { navigate } from 'gatsby'

import Logo from '@components/logo'

const Expired = (): JSX.Element => {
  return (
    <>
      <Logo />
      <Stack margin="auto" maxWidth="400px" spacing={2}>
        <Alert severity="error" variant="filled">
          Voting session expired
        </Alert>
        <Typography sx={{ textAlign: 'center' }} variant="h6">
          The Choosee vote you are trying to access is missing or has expired.
        </Typography>
        <Button
          data-amplify-analytics-name="new-choices-click"
          data-amplify-analytics-on="click"
          fullWidth
          onClick={() => navigate('/')}
          variant="contained"
        >
          Make new choices
        </Button>
      </Stack>
    </>
  )
}

export default Expired
