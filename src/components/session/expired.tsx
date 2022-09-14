import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import React from 'react'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { navigate } from 'gatsby'

import Logo from '@components/logo'

const Expired = (): JSX.Element => {
  return (
    <>
      <Logo />
      <Card sx={{ margin: 'auto', maxWidth: 400 }} variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Alert severity="error" variant="filled">
              Voting session expired
            </Alert>
            <Typography sx={{ textAlign: 'center' }} variant="h6">
              The Choosee vote you are trying to access is missing or has expired.
            </Typography>
          </Stack>
        </CardContent>
        <CardActions>
          <Button
            data-amplify-analytics-name="new-choices-click"
            data-amplify-analytics-on="click"
            fullWidth
            onClick={() => navigate('/')}
            variant="outlined"
          >
            Make new choices
          </Button>
        </CardActions>
      </Card>
    </>
  )
}

export default Expired
