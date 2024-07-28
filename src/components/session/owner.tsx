import React, { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CheckBoxIcon from '@mui/icons-material/CheckBox'
import CircularProgress from '@mui/material/CircularProgress'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import Divider from '@mui/material/Divider'
import jsonpatch from 'fast-json-patch'
import { QRCodeSVG } from 'qrcode.react'
import Slider from '@mui/material/Slider'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { useTheme } from '@mui/material/styles'

import { SessionData } from '@types'
import { updateSession } from '@services/sessions'

export interface OwnerProps {
  loggedIn: boolean
  session: SessionData
  sessionId: string
  setSession: (value: SessionData) => void
}

const Owner = ({ loggedIn, session, sessionId, setSession }: OwnerProps): JSX.Element => {
  const [errorMessage, setErrorMessage] = useState<string | undefined>()
  const [isLoading, setIsLoading] = useState(false)
  const [sessionUrl, setSessionUrl] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string | undefined>()
  const [workingSession, setWorkingSession] = useState(session)

  const theme = useTheme()

  const copySessionUrl = () => {
    try {
      navigator.clipboard.writeText(sessionUrl)
      setSuccessMessage('Link copied to clipboard')
      setErrorMessage(undefined)
    } catch (error) {
      console.error('copyShortenedUrl', { error, sessionUrl })
      setErrorMessage('Could not copy link to clipboard')
    }
  }

  const patchSession = async () => {
    setIsLoading(true)
    try {
      const jsonPatchOperations = jsonpatch.compare(session, workingSession, true)
      const updatedSession = await updateSession(sessionId, jsonPatchOperations)
      setSession(updatedSession)
      setSuccessMessage('Vote session updated successfully')
    } catch (error) {
      console.error('patchSession', { error, session, workingSession })
      setErrorMessage('Error updating vote session')
    }
    setIsLoading(false)
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
      <Stack margin="auto" maxWidth="600px" spacing={2}>
        <Divider />
        <Card sx={{ p: '15px' }} variant="outlined">
          <CardContent>
            <label>
              <TextField
                aria-readonly="true"
                fullWidth
                label="Invite URL"
                name="invite-url"
                type="text"
                value={sessionUrl}
                variant="filled"
              />
            </label>
          </CardContent>
          <CardActions>
            <Button fullWidth onClick={copySessionUrl} startIcon={<ContentCopyIcon />} variant="outlined">
              Copy invite URL
            </Button>
          </CardActions>
        </Card>
        <Card sx={{ p: '0 15px', textAlign: 'center' }} variant="outlined">
          <CardHeader title="Invite QR code" />
          <CardContent>
            <QRCodeSVG
              bgColor={theme.palette.background.paper}
              fgColor={theme.palette.primary.main}
              value={sessionUrl}
            />
          </CardContent>
        </Card>
        {loggedIn && (
          <>
            <Divider />
            <Card sx={{ p: '15px' }} variant="outlined">
              <CardHeader sx={{ textAlign: 'center' }} title="Vote Options" />
              <CardContent>
                <label>
                  Number of voters: {workingSession.voterCount}
                  <Slider
                    aria-label="Number of voters"
                    defaultValue={workingSession.voterCount}
                    disabled={isLoading}
                    marks={true}
                    max={10}
                    min={1}
                    onChange={(_: any, value: any) => setWorkingSession({ ...workingSession, voterCount: value })}
                    step={1}
                    sx={{ paddingTop: '35px' }}
                    valueLabelDisplay="auto"
                  />
                </label>
              </CardContent>
              <CardActions>
                <Button
                  data-amplify-analytics-name="update-session-click"
                  data-amplify-analytics-on="click"
                  disabled={isLoading}
                  fullWidth
                  onClick={patchSession}
                  startIcon={isLoading ? <CircularProgress color="inherit" size={14} /> : <CheckBoxIcon />}
                  variant="outlined"
                >
                  {isLoading ? 'Loading...' : 'Update vote options'}
                </Button>
              </CardActions>
            </Card>
          </>
        )}
        <Snackbar autoHideDuration={15_000} onClose={snackbarErrorClose} open={errorMessage !== undefined}>
          <Alert onClose={snackbarErrorClose} severity="error" variant="filled">
            {errorMessage}
          </Alert>
        </Snackbar>
        <Snackbar autoHideDuration={5_000} onClose={snackbarSuccessClose} open={successMessage !== undefined}>
          <Alert onClose={snackbarSuccessClose} severity="success" variant="filled">
            {successMessage}
          </Alert>
        </Snackbar>
      </Stack>
    </div>
  )
}

export default Owner
