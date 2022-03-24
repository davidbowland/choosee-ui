import Alert from '@mui/material/Alert'
import React from 'react'

export interface AlertsProps {
  errorMessage?: string
  successMessage?: string
}

const Alerts = ({ errorMessage, successMessage }: AlertsProps): JSX.Element | null => {
  if (errorMessage) {
    return (
      <p>
        <Alert severity="error">{errorMessage}</Alert>
      </p>
    )
  } else if (successMessage) {
    return (
      <p>
        <Alert severity="success">{successMessage}</Alert>
      </p>
    )
  }
  return null
}

export default Alerts
