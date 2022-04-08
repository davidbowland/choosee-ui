import React, { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'

export interface OwnerProps {
  sessionId: string
}

const Owner = ({ sessionId }: OwnerProps): JSX.Element => {
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
  const [sessionUrl, setSessionUrl] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string | undefined>(undefined)

  const copySessionUrl = () => {
    try {
      navigator.clipboard.writeText(sessionUrl)
      setSuccessMessage('Link copied to clipboard')
      setErrorMessage(undefined)
    } catch (error) {
      console.error('copyShortenedUrl', error)
      setErrorMessage('Could not copy link to clipboard')
    }
  }

  const snackbarErrorClose = (): void => {
    setErrorMessage(undefined)
  }

  const snackbarSuccessClose = (): void => {
    setSuccessMessage(undefined)
  }

  useEffect(() => {
    setSessionUrl(`${window.location.origin}/s/${sessionId}`)
  }, [sessionId])

  return (
    <div>
      <Stack margin="auto" maxWidth="400px" spacing={2}>
        <label>
          <TextField
            aria-readonly="true"
            fullWidth
            label="Session URL"
            name="session-url"
            type="text"
            value={sessionUrl}
            variant="filled"
          />
        </label>
        <Button fullWidth onClick={copySessionUrl} variant="contained">
          Copy session URL
        </Button>
        <Snackbar autoHideDuration={15_000} onClose={snackbarErrorClose} open={errorMessage !== undefined}>
          <Alert onClose={snackbarErrorClose} severity="error">
            {errorMessage}
          </Alert>
        </Snackbar>
        <Snackbar autoHideDuration={5_000} onClose={snackbarSuccessClose} open={successMessage !== undefined}>
          <Alert onClose={snackbarSuccessClose} severity="success">
            {successMessage}
          </Alert>
        </Snackbar>
      </Stack>
    </div>
  )
}

export default Owner
