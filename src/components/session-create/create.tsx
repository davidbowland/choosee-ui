import React, { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormLabel from '@mui/material/FormLabel'
import { navigate } from 'gatsby'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Slider from '@mui/material/Slider'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { AddressResult, NewSession, PlaceType, RankByType, StringObject } from '@types'
import { createSession, createSessionAuthenticated, textSession } from '@services/sessions'
import { fetchAddress, fetchAddressAuthenticated } from '@services/maps'

const METERS_PER_MILE = 1609.34

interface VoterIds {
  [key: number]: string | undefined
}

export interface CreateProps {
  loggedIn: boolean
}

const Create = ({ loggedIn }: CreateProps): JSX.Element => {
  const [address, setAddress] = useState('')
  const [addressError, setAddressError] = useState<string | undefined>()
  const [choiceType, setChoiceType] = useState<PlaceType>('restaurant')
  const [errorMessage, setErrorMessage] = useState<string | undefined>()
  const [isLoading, setIsLoading] = useState(false)
  const [openNow, setOpenNow] = useState(true)
  const [priceRange, setPriceRange] = useState<number[]>([1, 4])
  const [radius, setRadius] = useState(30)
  const [rankBy, setRankBy] = useState<RankByType>('prominence')
  const [successMessage, setSuccessMessage] = useState<string | undefined>()
  const [voterCount, setVoterCount] = useState(loggedIn ? 2 : 1)
  const [voterIds, setVoterIds] = useState<VoterIds>({})
  const [voterIdErrors, setVoterIdErrors] = useState<VoterIds>({})

  const generateSession = async (): Promise<void> => {
    if (!address) {
      setAddressError('Please enter your address to begin')
      return
    }
    setAddressError(undefined)

    const errors = Array.from({ length: voterCount - 1 }).reduce((acc: any, _, index: any) => {
      const isValidPhone = voterIds[index]?.match(/^\+1[2-9]\d{9}$/) !== null
      if (!isValidPhone && voterIds[index] !== '') {
        acc[index] = 'Invalid phone number. Be sure to include area code.'
      }
      return acc
    }, {} as VoterIds) as string[]

    setVoterIdErrors(errors)
    if (Object.keys(errors).length > 0) {
      return
    }

    setIsLoading(true)
    try {
      const newSession: NewSession = {
        address,
        maxPrice: priceRange[1],
        minPrice: priceRange[0],
        openNow,
        pagesPerRound: 1,
        radius: rankBy === 'prominence' ? radius * METERS_PER_MILE : undefined,
        rankBy,
        type: choiceType,
        voterCount,
      }

      const session = await postSession(newSession)
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
      console.error('generateSession', { error })
      if (error?.message === 'Invalid address') {
        setAddressError(error?.message)
      } else if (error?.response?.status === 403) {
        setErrorMessage('Unusual traffic detected, please log in to continue.')
      } else {
        setErrorMessage('Error generating Choosee voting session. Please try again later.')
      }
      setIsLoading(false)
    }
  }

  const getAddress = async (lat: number, lng: number): Promise<AddressResult> => {
    if (loggedIn) {
      return await fetchAddressAuthenticated(lat, lng)
    }
    const token = await grecaptcha.execute(process.env.GATSBY_RECAPTCHA_SITE_KEY, { action: 'GEOCODE' })
    return await fetchAddress(lat, lng, token)
  }

  const onVoterIdChange = (index: number, value: string): void => {
    const sanitizedPhone = value.replace(/\D/g, '')
    const phoneWithCountry = sanitizedPhone.replace(/^\+?1?([2-9]\d+)/, '+1$1')
    const trimmedPhone = phoneWithCountry.substring(0, 12)
    setVoterIds({ ...voterIds, [index]: trimmedPhone })
  }

  const postSession = async (newSession: NewSession): Promise<StringObject> => {
    if (loggedIn) {
      return await createSessionAuthenticated(newSession)
    }
    const token = await grecaptcha.execute(process.env.GATSBY_RECAPTCHA_SITE_KEY, { action: 'CREATE_SESSION' })
    return await createSession(newSession, token)
  }

  const setLatLng = async (lat: number, lng: number): Promise<void> => {
    try {
      const fetchedAddress = await getAddress(lat, lng)
      setAddress(fetchedAddress.address)
    } catch (error: any) {
      if (error?.response?.status === 403) {
        setErrorMessage('Unusual traffic detected, please log in to continue.')
      }
      console.error('setLatLng', { error, lat, lng })
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
  }, [loggedIn])

  return (
    <>
      <Card sx={{ m: 'auto', maxWidth: 600, p: 2, width: '100%' }} variant="outlined">
        <CardHeader sx={{ textAlign: 'center' }} title="Restaurant Search" />
        <CardContent>
          <Stack spacing={2}>
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
              <FormLabel id="restaurant-type-group-label">Restaurant type</FormLabel>
              <RadioGroup
                name="restaurant-type-radio-buttons-group"
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setChoiceType(event.target.value as PlaceType)
                }
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
            <FormControl>
              <FormLabel id="sort-by-group-label">Sort by</FormLabel>
              <RadioGroup
                name="sort-by-radio-buttons-group"
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setRankBy(event.target.value as RankByType)}
                value={rankBy}
              >
                <FormControlLabel
                  control={<Radio />}
                  disabled={isLoading}
                  id="sort-prominence"
                  label="Most prominent first"
                  value="prominence"
                />
                <FormControlLabel
                  control={<Radio />}
                  disabled={isLoading}
                  id="sort-distance"
                  label="Closest first"
                  value="distance"
                />
              </RadioGroup>
            </FormControl>
            {rankBy === 'prominence' && (
              <label>
                Maximum distance: {radius} {radius === 1 ? 'mile' : 'miles'}
                <Slider
                  aria-label="Max distance to restaurant"
                  defaultValue={radius}
                  disabled={isLoading}
                  marks={true}
                  max={30}
                  min={1}
                  onChange={(_: any, value: any) => setRadius(value)}
                  step={1}
                  sx={{ paddingTop: '35px' }}
                  valueLabelDisplay="auto"
                />
              </label>
            )}
            <label>
              Price range
              <Slider
                aria-label="Price range"
                defaultValue={priceRange}
                disabled={isLoading}
                marks={[
                  { label: 'Cheapest', value: 1 },
                  { label: 'Priciest', value: 4 },
                ]}
                max={4}
                min={1}
                onChange={(_: any, value: any) => setPriceRange(value)}
                step={1}
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
            {!loggedIn && (
              <Typography style={{ textAlign: 'center' }} variant="body1">
                Sign up to text invite links!
              </Typography>
            )}
            {loggedIn && voterCount > 1 && (
              <Alert severity="info" variant="filled">
                You must distribute the invite link to voters. Enter the phone number of other voters to text them the
                link!
              </Alert>
            )}
            {loggedIn &&
              Array.from({ length: voterCount - 1 }).map((_, index) => (
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
            <Typography style={{ textAlign: 'center' }} variant="caption">
              Voting sessions automatically expire after 24 hours
            </Typography>
          </Stack>
        </CardContent>
        <CardActions>
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
        </CardActions>
      </Card>
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
    </>
  )
}

export default Create
