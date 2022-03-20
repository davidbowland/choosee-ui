import { Auth } from 'aws-amplify'
import { navigate } from 'gatsby'
import LoginIcon from '@mui/icons-material/Login'
import TextsmsIcon from '@mui/icons-material/Textsms'
import TextsmsOutlinedIcon from '@mui/icons-material/TextsmsOutlined'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormLabel from '@mui/material/FormLabel'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Slider from '@mui/material/Slider'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import React, { useEffect, useState } from 'react'

import { FloatingFab } from './elements'
import { createSession, textSession } from '@services/sessions'
import { AuthState, NewSession, RestaurantType } from '@types'

const MILES_TO_METERS = 1_609.34

export interface SessionCreateProps {
  setAuthState: (state: AuthState) => void
  setShowLogin: (state: boolean) => void
}

const SessionCreate = ({ setAuthState, setShowLogin }: SessionCreateProps): JSX.Element => {
  const [address, setAddress] = useState('')
  const [choiceType, setChoiceType] = useState<RestaurantType>('restaurant')
  const [createVisible, setCreateVisible] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [radius, setRadius] = useState(30 * MILES_TO_METERS)
  const [requestText, setRequestText] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | undefined>(undefined)

  const signInClick = () => {
    setAuthState('signIn')
    setShowLogin(true)
  }

  const signUpClick = () => {
    setAuthState('signUp')
    setShowLogin(true)
  }

  const generateSession = async () => {
    if (!address) {
      setErrorMessage('Please enter an address to begin')
      return
    }

    setIsLoading(true)
    try {
      const newSession: NewSession = {
        address,
        radius,
        type: choiceType,
      }
      const session = await createSession(newSession)
      setErrorMessage(undefined)
      setSuccessMessage('Session starting')

      if (requestText) {
        textSession(session.sessionId)
      }

      navigate(`/s/${session.sessionId}`)
    } catch (error: any) {
      console.error('generateSession', error)
      setErrorMessage(`Error generating Choosee session: ${error?.message ?? 'Please try again later'}`)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    Auth.currentAuthenticatedUser()
      .then(() => setCreateVisible(true))
      .catch(() => null)
  }, [])

  const renderAlerts = (): JSX.Element | null => {
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

  const renderCreate = (): JSX.Element => {
    return (
      <>
        <p>
          <label>
            <TextField
              aria-readonly="true"
              autoComplete="postal-code"
              disabled={isLoading}
              fullWidth
              label="Your address"
              name="address"
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setAddress(event.target.value)}
              type="text"
              value={address}
              variant="filled"
            />
          </label>
        </p>
        <p>
          <label>
            Search radius (miles)
            <Slider
              aria-label="Search radius in miles"
              defaultValue={50}
              marks={true}
              max={30}
              min={1}
              onChange={(_: any, value: any) => setRadius(value * MILES_TO_METERS)}
              step={1}
              valueLabelDisplay="on"
            />
          </label>
        </p>
        <p style={{ textAlign: 'center' }}>
          <FormControl>
            <FormLabel id="radio-buttons-group-label">Restaurant type</FormLabel>
            <RadioGroup
              name="controlled-radio-buttons-group"
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setChoiceType(event.target.value as RestaurantType)
              }
              value={choiceType}
            >
              <FormControlLabel control={<Radio />} id="dine-in" label="Dine-in" value="restaurant" />
              <FormControlLabel control={<Radio />} id="delivery" label="Delivery" value="meal_delivery" />
              <FormControlLabel control={<Radio />} id="takeout" label="Takeout" value="meal_takeaway" />
            </RadioGroup>
          </FormControl>
        </p>
        <p style={{ textAlign: 'center' }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={requestText}
                checkedIcon={<TextsmsIcon />}
                icon={<TextsmsOutlinedIcon />}
                onClick={(event: any) => setRequestText(event.target.checked)}
              />
            }
            label="Text me my session link for sharing"
          />
        </p>
        <p>
          <Button
            data-amplify-analytics-name="generate-link-click"
            data-amplify-analytics-on="click"
            disabled={isLoading}
            fullWidth
            onClick={generateSession}
            variant="contained"
          >
            {isLoading ? 'Loading...' : 'Choose restaurants'}
          </Button>
        </p>
        <p style={{ textAlign: 'center' }}>Sessions automatically expire after 24 hours</p>
      </>
    )
  }

  const renderCta = (): JSX.Element => {
    return (
      <>
        <p>
          <Typography sx={{ textAlign: 'center' }} variant="h6">
            Vote on where you want to eat tonight. Share a link for others to vote with you. Sign up or sign in to get
            started.
          </Typography>
        </p>
        <p>
          <Button fullWidth onClick={signUpClick} variant="contained">
            Sign up
          </Button>
        </p>
        <p>
          <Typography>
            A free account is required to keep our costs low. We don&apos;t sell your information and deleting your
            account is easy.
          </Typography>
        </p>
        <p style={{ height: '100px' }}>
          <FloatingFab aria-label="sign in" color="primary" onClick={signInClick}>
            <LoginIcon />
          </FloatingFab>
        </p>
      </>
    )
  }

  return (
    <>
      <Typography sx={{ textAlign: 'center' }} variant="h2">
        Choosee
      </Typography>
      <Typography sx={{ textAlign: 'center' }} variant="h4">
        The restaurant choice helper
      </Typography>
      <Divider />
      {renderAlerts()}
      {createVisible ? renderCreate() : renderCta()}
    </>
  )
}

export default SessionCreate
