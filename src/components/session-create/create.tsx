import { navigate } from 'gatsby'
import TextsmsIcon from '@mui/icons-material/Textsms'
import TextsmsOutlinedIcon from '@mui/icons-material/TextsmsOutlined'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import Backdrop from '@mui/material/Backdrop'
import CircularProgress from '@mui/material/CircularProgress'
import FormLabel from '@mui/material/FormLabel'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Slider from '@mui/material/Slider'
import TextField from '@mui/material/TextField'
import React, { useState } from 'react'

import Alerts from './alerts'
import Logo from '@components/logo'
import { createSession, textSession } from '@services/sessions'
import { NewSession, RestaurantType } from '@types'

const MILES_TO_METERS = 1_609.34

const Create = (): JSX.Element => {
  const [address, setAddress] = useState('')
  const [addressError, setAddressError] = useState<string | undefined>(undefined)
  const [choiceType, setChoiceType] = useState<RestaurantType>('restaurant')
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [radius, setRadius] = useState(30 * MILES_TO_METERS)
  const [requestText, setRequestText] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | undefined>(undefined)

  const generateSession = async () => {
    if (!address) {
      setAddressError('Please enter your address to begin')
      return
    }
    setAddressError(undefined)

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
      if (error?.message === 'Invalid address') {
        setAddressError(error?.message)
      } else {
        setErrorMessage('Error generating Choosee session. Please try again later.')
      }
    }
    setIsLoading(false)
  }

  return (
    <>
      <Logo />
      <Alerts errorMessage={errorMessage} successMessage={successMessage} />
      <div>
        <label>
          <TextField
            aria-readonly="true"
            autoComplete="postal-code"
            disabled={isLoading}
            error={addressError !== undefined}
            fullWidth
            helperText={addressError}
            label="Your address"
            name="address"
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setAddress(event.target.value)}
            type="text"
            value={address}
            variant="filled"
          />
        </label>
      </div>
      <br />
      <div>
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
      </div>
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
      <Button
        data-amplify-analytics-name="generate-session-click"
        data-amplify-analytics-on="click"
        disabled={isLoading}
        fullWidth
        onClick={generateSession}
        variant="contained"
      >
        {isLoading ? 'Loading...' : 'Choose restaurants'}
      </Button>
      <p style={{ textAlign: 'center' }}>Sessions automatically expire after 24 hours</p>
      <Backdrop open={isLoading} sx={{ color: '#fff', zIndex: (theme: any) => theme.zIndex.drawer + 1 }}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </>
  )
}

export default Create
