import { Auth } from 'aws-amplify'
import jsonpatch from 'fast-json-patch'
import { navigate } from 'gatsby'
import CheckIcon from '@mui/icons-material/Check'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import DoNotDisturbIcon from '@mui/icons-material/DoNotDisturb'
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded'
import FollowTheSignsOutlinedIcon from '@mui/icons-material/FollowTheSignsOutlined'
import LoginIcon from '@mui/icons-material/Login'
import MonetizationOnRoundedIcon from '@mui/icons-material/MonetizationOnRounded'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import Alert from '@mui/material/Alert'
import Backdrop from '@mui/material/Backdrop'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import CircularProgress from '@mui/material/CircularProgress'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import React, { useEffect, useState } from 'react'

import Logo from '@components/logo'
import { fetchChoices, fetchDecisions, fetchStatus, updateDecisions } from '@services/sessions'
import { AuthState, CognitoUserAmplify, DecisionObject, Restaurant, StatusObject } from '@types'

const delayBetweenRefreshMs = parseInt(process.env.GATSBY_DELAY_BETWEEN_REFRESH_MS, 10)

export interface SessionProps {
  initialUserId?: string
  sessionId: string
  setAuthState: (value: AuthState) => void
  setShowLogin: (value: boolean) => void
}

const Session = ({ initialUserId, sessionId, setAuthState, setShowLogin }: SessionProps): JSX.Element => {
  const [choices, setChoices] = useState<Restaurant[]>([])
  const [currentTimeout, setCurrentTimeout] = useState<NodeJS.Timeout | undefined>(undefined)
  const [decisions, setDecisions] = useState<DecisionObject>({})
  const [decisionsInitial, setDecisionsInitial] = useState<DecisionObject>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isWaiting, setIsWaiting] = useState(false)
  const [loggedInUser, setLoggedInUser] = useState<CognitoUserAmplify | undefined>(undefined)
  const [pageId, setPageId] = useState(-2)
  const [restaurant, setRestaurant] = useState<Restaurant | undefined>(undefined)
  const [status, setStatus] = useState<StatusObject>({ address: '', current: 'deciding', pageId: -1 })
  const [userId, setUserId] = useState(initialUserId ?? '+1')
  const [userIdError, setUserIdError] = useState<string | undefined>(undefined)

  const cancelTimeout = () => {
    if (currentTimeout) {
      clearTimeout(currentTimeout)
      setCurrentTimeout(undefined)
    }
  }

  const chooseClick = () => {
    if (userId.match(/\+1\d{10}/) === null) {
      setUserIdError('Invalid phone number. Be sure to include area code.')
      return
    }
    setUserIdError(undefined)

    setLoggedInUser(({ attributes: { phone_number: userId } } as unknown) as CognitoUserAmplify)
  }

  const findNextRestaurant = (availableChoices: Restaurant[]): void => {
    const [firstRestaurant, ...otherChoices] = availableChoices
    setChoices(otherChoices)
    if (firstRestaurant.name in decisions) {
      if (otherChoices.length > 0) {
        findNextRestaurant(otherChoices)
      } else {
        refreshDecisions().then(refreshStatus)
      }
    } else {
      setRestaurant(firstRestaurant)
    }
  }

  const makeChoice = async (_: any, value: number) => {
    setDecisions({ ...decisions, [restaurant!.name]: value === 0 })
  }

  const nextRestaurant = async () => {
    setRestaurant(undefined)
    if (choices.length > 0) {
      findNextRestaurant(choices)
    } else {
      await refreshDecisions()
      await refreshStatus()
    }
  }

  const onUserIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const sanitizedPhone = event.target.value.replace(/\D/g, '')
    const phoneWithCountry = sanitizedPhone.replace(/^\+?1?/, '+1')
    const trimmedPhone = phoneWithCountry.substring(0, 12)
    setUserId(trimmedPhone)
  }

  const refreshChoices = async () => {
    try {
      const currentChoices = await fetchChoices(sessionId)
      setChoices(currentChoices)
    } catch (error) {
      console.error('refreshChoices', error)
    }
  }

  const refreshDecisions = async () => {
    if (loggedInUser) {
      const jsonPatchOperations = jsonpatch.compare(decisionsInitial, decisions, true)
      if (jsonPatchOperations.length > 0) {
        await updateDecisions(sessionId, loggedInUser!.attributes!.phone_number, jsonPatchOperations)
        setDecisionsInitial(decisions)
      } else {
        const currentDecisions = await fetchDecisions(sessionId, loggedInUser!.attributes!.phone_number)
        setDecisions(currentDecisions)
        setDecisionsInitial(currentDecisions)
      }
    }
  }

  const refreshStatus = async () => {
    if (status.current === 'winner' || status.current === 'finished') {
      return
    }
    setIsLoading(true)

    try {
      const currentStatus = await fetchStatus(sessionId)
      setStatus(currentStatus)
      cancelTimeout()
      if (currentStatus.pageId !== pageId) {
        setIsWaiting(false)
        setPageId(currentStatus.pageId)
        await refreshChoices()
      } else if (currentStatus.current === 'deciding') {
        setIsWaiting(true)
        const timeout = setTimeout(refreshStatus, delayBetweenRefreshMs)
        setCurrentTimeout(timeout)
        return
      }
    } catch (error) {
      console.error('reloadStatus', error)
      setStatus({ address: '', current: 'expired', pageId: 0 })
    }
    setIsLoading(false)
  }

  const signInClick = () => {
    setAuthState('signIn')
    setShowLogin(true)
  }

  const signUpClick = () => {
    setAuthState('signUp')
    setShowLogin(true)
  }

  const renderLogin = (): JSX.Element => {
    return (
      <>
        <Logo />
        <Typography variant="h6">Enter your phone number to vote</Typography>
        <div>
          <label>
            <TextField
              aria-readonly="true"
              autoComplete="tel"
              error={userIdError !== undefined}
              fullWidth
              helperText={userIdError}
              label="Your phone number"
              placeholder="+10000000000"
              name="phone_number"
              onChange={onUserIdChange}
              type="tel"
              value={userId}
              variant="filled"
            />
          </label>
        </div>
        <br />
        <Button
          data-amplify-analytics-name="lets-choose-click"
          data-amplify-analytics-on="click"
          fullWidth
          onClick={chooseClick}
          startIcon={<DoneAllIcon />}
          variant="contained"
        >
          Let&apos;s choose!
        </Button>
        <Typography sx={{ margin: '0.5em auto', textAlign: 'center' }} variant="h6">
          -- or --
        </Typography>
        <Button
          data-amplify-analytics-name="sign-up-click"
          data-amplify-analytics-on="click"
          fullWidth
          onClick={signUpClick}
          startIcon={<FollowTheSignsOutlinedIcon />}
          variant="contained"
        >
          Sign up
        </Button>
        <Typography sx={{ margin: '0.5em auto', textAlign: 'center' }} variant="h6">
          -- or --
        </Typography>
        <Button fullWidth onClick={signInClick} startIcon={<LoginIcon />} variant="contained">
          Sign in
        </Button>
      </>
    )
  }

  const renderDeciding = (): JSX.Element => {
    if (restaurant === undefined) {
      return (
        <>
          <Logo />
          <Typography sx={{ textAlign: 'center' }} variant="h6">
            Loading...
          </Typography>
        </>
      )
    }
    return (
      <>
        <Typography sx={{ textAlign: 'center' }} variant="h6">
          {status!.address}
        </Typography>
        <br />
        {restaurant && (
          <Card sx={{ margin: 'auto', maxWidth: 350 }}>
            {restaurant.pic ? (
              <CardMedia alt={`Photo of ${restaurant.name}`} component="img" height="200" image={restaurant.pic} />
            ) : (
              <div style={{ textAlign: 'center' }}>
                <RestaurantIcon fontSize="large" sx={{ height: 200 }} />
              </div>
            )}
            <CardContent>
              <Typography gutterBottom variant="h5" component="div">
                {restaurant.name}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {restaurant.vicinity}
              </Typography>
              {restaurant.rating !== undefined && (
                <div>
                  {Array.from({ length: Math.round(restaurant.rating) }).map((_, index) => (
                    <FavoriteRoundedIcon key={index} />
                  ))}
                </div>
              )}
              {restaurant.priceLevel !== undefined && (
                <div>
                  {Array.from({ length: Math.round(restaurant.priceLevel) }).map((_, index) => (
                    <MonetizationOnRoundedIcon key={index} />
                  ))}
                </div>
              )}
            </CardContent>
            <BottomNavigation onChange={makeChoice} showLabels>
              <BottomNavigationAction icon={<CheckIcon />} label="Let's eat" />
              <BottomNavigationAction icon={<DoNotDisturbIcon />} label="Maybe later" />
            </BottomNavigation>
          </Card>
        )}
      </>
    )
  }

  const renderWinner = (): JSX.Element => {
    const winner = status!.winner!
    return (
      <>
        <Logo />
        <Typography sx={{ textAlign: 'center' }} variant="h5">
          The winning decision is:
        </Typography>
        <br />
        <Card sx={{ margin: 'auto', maxWidth: 350 }}>
          {winner.pic ? (
            <CardMedia alt={`Photo of ${winner.name}`} component="img" height="200" image={winner.pic} />
          ) : (
            <div style={{ textAlign: 'center' }}>
              <RestaurantIcon fontSize="large" sx={{ height: 200 }} />
            </div>
          )}
          <CardContent>
            <Typography gutterBottom variant="h5" component="div">
              {winner.name}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              {winner.vicinity}
            </Typography>
            {winner.rating !== undefined && (
              <div>
                {Array.from({ length: Math.round(winner.rating) }).map((_, index) => (
                  <FavoriteRoundedIcon key={index} />
                ))}
              </div>
            )}
            {winner.priceLevel !== undefined && (
              <div>
                {Array.from({ length: Math.round(winner.priceLevel) }).map((_, index) => (
                  <MonetizationOnRoundedIcon key={index} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <br />
        <div style={{ textAlign: 'center' }}>
          <Button
            data-amplify-analytics-name="new-choices-click"
            data-amplify-analytics-on="click"
            onClick={() => navigate('/')}
            variant="contained"
          >
            Make new choices
          </Button>
        </div>
      </>
    )
  }

  const renderFinished = (): JSX.Element => {
    return (
      <>
        <Logo />
        <Alert severity="error">Choices exhausted</Alert>
        <br />
        <Typography sx={{ textAlign: 'center' }} variant="h6">
          All choices have been exhausted. You might be just a little too Choosee!
        </Typography>
        <br />
        <Button
          data-amplify-analytics-name="new-choices-click"
          data-amplify-analytics-on="click"
          fullWidth
          onClick={() => navigate('/')}
          variant="contained"
        >
          Make new choices
        </Button>
      </>
    )
  }

  const renderExpired = (): JSX.Element => {
    return (
      <>
        <Logo />
        <Alert severity="error">Session expired</Alert>
        <br />
        <Typography sx={{ textAlign: 'center' }} variant="h6">
          The Choosee session you are trying to access is missing or has expired.
        </Typography>
        <br />
        <Button
          data-amplify-analytics-name="new-choices-click"
          data-amplify-analytics-on="click"
          fullWidth
          onClick={() => navigate('/')}
          variant="contained"
        >
          Make new choices
        </Button>
      </>
    )
  }

  const renderSession = (): JSX.Element => {
    if (status?.current === 'expired') {
      return renderExpired()
    } else if (loggedInUser === undefined) {
      return renderLogin()
    } else if (status?.current === 'deciding') {
      return renderDeciding()
    } else if (status?.current === 'winner') {
      return renderWinner()
    } else if (status?.current === 'finished') {
      return renderFinished()
    } else {
      return (
        <>
          <Typography color="#fff" variant="h6">
            An error has occurred
          </Typography>
        </>
      )
    }
  }

  useEffect(() => {
    if (restaurant === undefined && choices.length > 0 && loggedInUser) {
      nextRestaurant()
    }
  }, [choices])

  useEffect(() => {
    nextRestaurant()
  }, [decisions])

  useEffect(() => {
    refreshDecisions()
  }, [loggedInUser])

  useEffect(() => {
    Auth.currentAuthenticatedUser()
      .then(setLoggedInUser)
      .catch(() => null)
    refreshStatus()
  }, [])

  return (
    <>
      {renderSession()}
      <Backdrop open={isLoading} sx={{ color: '#fff', zIndex: (theme: any) => theme.zIndex.drawer + 1 }}>
        {isWaiting && (
          <Typography color="#fff" variant="h6">
            Waiting for other voters&nbsp;
          </Typography>
        )}
        <CircularProgress color="inherit" />
      </Backdrop>
    </>
  )
}

export default Session
