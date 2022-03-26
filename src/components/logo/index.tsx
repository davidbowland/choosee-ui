import Divider from '@mui/material/Divider'
import React from 'react'
import Typography from '@mui/material/Typography'

const Logo = (): JSX.Element => (
  <>
    <Typography sx={{ textAlign: 'center' }} variant="h2">
      Choosee
    </Typography>
    <Divider sx={{ marginBottom: '2em' }} />
  </>
)

export default Logo
