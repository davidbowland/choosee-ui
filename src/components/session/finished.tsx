import { navigate } from 'gatsby'
import React from 'react'

import CheckBoxIcon from '@mui/icons-material/CheckBox'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

const Finished = (): JSX.Element => {
  return (
    <Card sx={{ margin: 'auto', maxWidth: 400 }} variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Alert severity="error" variant="filled">
            Choices exhausted
          </Alert>
          <Typography sx={{ textAlign: 'center' }} variant="h6">
            All choices have been exhausted. You might be just a little too Choosee!
          </Typography>
        </Stack>
      </CardContent>
      <CardActions>
        <Button
          data-amplify-analytics-name="new-choices-click"
          data-amplify-analytics-on="click"
          fullWidth
          onClick={() => navigate('/')}
          startIcon={<CheckBoxIcon />}
          variant="outlined"
        >
          Make new choices
        </Button>
      </CardActions>
    </Card>
  )
}

export default Finished
