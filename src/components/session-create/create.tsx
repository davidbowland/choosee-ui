import React, { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormLabel from '@mui/material/FormLabel'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Slider from '@mui/material/Slider'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { navigate } from 'gatsby'

import { NewSession, PlaceType } from '@types'
import { createSession, textSession } from '@services/sessions'
import Logo from '@components/logo'
import { fetchAddress } from '@services/maps'

const VOTES_PER_PAGE = 20

interface VoterIds {
  [key: number]: string | undefined
}

const Create = (): JSX.Element => {
  const [address, setAddress] = useState('')
  const [addressError, setAddressError] = useState<string | undefined>(undefined)
  const [choiceType, setChoiceType] = useState<PlaceType>('restaurant')
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [openNow, setOpenNow] = useState(true)
  const [successMessage, setSuccessMessage] = useState<string | undefined>(undefined)
  const [voterCount, setVoterCount] = useState(2)
  const [voterIds, setVoterIds] = useState<VoterIds>({})
  const [voterIdErrors, setVoterIdErrors] = useState<VoterIds>({})
  const [votesPerRound, setVotesPerRound] = useState(20)

  const generateSession = async (): Promise<void> => {
    if (!address) {
      setAddressError('Please enter your address to begin')
      return
    }
    setAddressError(undefined)

    const errors = Array.from({ length: voterCount - 1 }).reduce((agg: any, _, index: any) => {
      if (voterIds[index]?.match(/^\+1[2-9]\d{9}$/) === null && voterIds[index] !== '') {
        agg[index] = 'Invalid phone number. Be sure to include area code.'
      }
      return agg
    }, {}) as VoterIds
    setVoterIdErrors(errors)
    if (Object.keys(errors).length > 0) {
      return
    }

    setIsLoading(true)
    try {
      const newSession: NewSession = {
        address,
        openNow,
        pagesPerRound: Math.round(votesPerRound / VOTES_PER_PAGE),
        type: choiceType,
        voterCount,
      }
      const session = await createSession(newSession)
      setErrorMessage(undefined)
      setSuccessMessage('Choosee voting session starting')

      await Promise.all(
        Array.from({ length: voterCount - 1 }).map((_, index: any) => {
          const phoneNumber = voterIds[index]
          if (phoneNumber) {
            textSession(session.sessionId, phoneNumber)
          }
        })
      )

      navigate(`/s/${session.sessionId}`)
    } catch (error: any) {
      console.error('generateSession', error)
      if (error?.message === 'Invalid address') {
        setAddressError(error?.message)
      } else {
        setErrorMessage('Error generating Choosee voting session. Please try again later.')
      }
      setIsLoading(false)
    }
  }

  const onVoterIdChange = (index: number, value: string): void => {
    const sanitizedPhone = value.replace(/\D/g, '')
    const phoneWithCountry = sanitizedPhone.replace(/^\+?1?([2-9]\d+)/, '+1$1')
    const trimmedPhone = phoneWithCountry.substring(0, 12)
    setVoterIds({ ...voterIds, [index]: trimmedPhone })
  }

  const setLatLng = async (lat: number, lng: number): Promise<void> => {
    try {
      const fetchedAddress = await fetchAddress(lat, lng)
      setAddress(fetchedAddress.address)
    } catch (error) {
      console.error('setLatLng', error)
    }
  }

  const snackbarErrorClose = (): void => {
    setErrorMessage(undefined)
  }

  const snackbarSuccessClose = (): void => {
    setSuccessMessage(undefined)
  }

  useEffect(() => {
    navigator.geolocation &&
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatLng(pos.coords.latitude, pos.coords.longitude)
        },
        undefined,
        { enableHighAccuracy: true }
      )
  }, [])

  return (
    <>
      <Logo />
      <Stack margin="auto" maxWidth="400px" spacing={2}>
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
        <FormControl>
          <FormLabel id="radio-buttons-group-label">Restaurant type</FormLabel>
          <RadioGroup
            name="controlled-radio-buttons-group"
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setChoiceType(event.target.value as PlaceType)}
            value={choiceType}
          >
            <FormControlLabel
              control={<Radio />}
              disabled={isLoading}
              id="dine-in"
              label="Dine-in"
              value="restaurant"
            />
            <FormControlLabel
              control={<Radio />}
              disabled={isLoading}
              id="delivery"
              label="Delivery"
              value="meal_delivery"
            />
            <FormControlLabel
              control={<Radio />}
              disabled={isLoading}
              id="takeout"
              label="Takeout"
              value="meal_takeaway"
            />
            <FormControlLabel control={<Radio />} disabled={isLoading} id="bar" label="Bar" value="bar" />
            <FormControlLabel control={<Radio />} disabled={isLoading} id="cafe" label="Café" value="cafe" />
            <FormControlLabel
              control={<Radio />}
              disabled={isLoading}
              id="night-club"
              label="Night club"
              value="night_club"
            />
          </RadioGroup>
        </FormControl>
        <FormControlLabel
          control={<Checkbox checked={openNow} onClick={(event: any) => setOpenNow(event.target.checked)} />}
          disabled={isLoading}
          label="Only show choices currently open"
        />
        <label>
          Max votes per round: {votesPerRound}
          <Slider
            aria-label="Max votes per round"
            defaultValue={votesPerRound}
            disabled={isLoading}
            marks={true}
            max={40}
            min={20}
            onChange={(_: any, value: any) => setVotesPerRound(value)}
            step={20}
            sx={{ paddingTop: '35px' }}
            valueLabelDisplay="auto"
          />
        </label>
        <label>
          Number of voters: {voterCount}
          <Slider
            aria-label="Number of voters"
            defaultValue={voterCount}
            disabled={isLoading}
            marks={true}
            max={10}
            min={1}
            onChange={(_: any, value: any) => setVoterCount(value)}
            step={1}
            sx={{ paddingTop: '35px' }}
            valueLabelDisplay="auto"
          />
        </label>
        {voterCount > 1 && (
          <Alert severity="info">
            You must distribute the session link to voters. Enter the phone number of other voters to text them the
            link!
          </Alert>
        )}
        {Array.from({ length: voterCount - 1 }).map((_, index) => (
          <label key={index}>
            <TextField
              aria-readonly="true"
              disabled={isLoading}
              error={voterIdErrors[index] !== undefined}
              fullWidth
              helperText={voterIdErrors[index]}
              key={index}
              label={`Voter #${index + 2} phone number (optional)`}
              name="phone_number"
              onChange={(event) => onVoterIdChange(index, event.target.value)}
              placeholder="+10000000000"
              type="tel"
              value={voterIds[index]}
              variant="filled"
            />
          </label>
        ))}
        <Button
          data-amplify-analytics-name="generate-session-click"
          data-amplify-analytics-on="click"
          disabled={isLoading}
          fullWidth
          onClick={generateSession}
          startIcon={isLoading ? <CircularProgress color="inherit" size={14} /> : null}
          variant="contained"
        >
          {isLoading ? 'Loading...' : 'Choose restaurants'}
        </Button>
        <Typography style={{ textAlign: 'center' }}>Voting sessions automatically expire after 24 hours</Typography>
      </Stack>
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
    </>
  )
}

export default Create
