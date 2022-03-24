import { Auth } from 'aws-amplify'
import jsonpatch from 'fast-json-patch'
import Alert from '@mui/material/Alert'
import Backdrop from '@mui/material/Backdrop'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import React, { useEffect, useState } from 'react'

import Logo from '@components/logo'
import Deciding from './deciding'
import Expired from './expired'
import Finished from './finished'
import LoginPrompt from './login-prompt'
import { fetchChoices, fetchDecisions, fetchStatus, updateDecisions } from '@services/sessions'
import { AuthState, CognitoUserAmplify, DecisionObject, Restaurant, StatusObject } from '@types'
import Winner from './winner'

const delayBetweenRefreshMs = parseInt(process.env.GATSBY_DELAY_BETWEEN_REFRESH_MS, 10)

export interface SessionProps {
  initialUserId?: string
  sessionId: string
  setAuthState: (value: AuthState) => void
  setShowLogin: (value: boolean) => void
}

const Session = ({ initialUserId, sessionId, setAuthState, setShowLogin }: SessionProps): JSX.Element => {
  const [choices, setChoices] = useState<Restaurant[]>([])
  const [decisions, setDecisions] = useState<DecisionObject>({})
  const [decisionsInitial, setDecisionsInitial] = useState<DecisionObject>({})
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [isWaiting, setIsWaiting] = useState(false)
  const [loggedInUser, setLoggedInUser] = useState<CognitoUserAmplify | undefined>(undefined)
  const [pageId, setPageId] = useState(-2)
  const [restaurant, setRestaurant] = useState<Restaurant | undefined>(undefined)
  const [status, setStatus] = useState<StatusObject>({ address: '', current: 'deciding', pageId: -1 })

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

  const makeChoice = (name: string, value: boolean) => {
    setDecisions({ ...decisions, [name]: value })
  }

  const nextRestaurant = async () => {
    setRestaurant(undefined)
    if (choices.length > 0) {
      findNextRestaurant(choices)
    }
  }
  const refreshChoices = async () => {
    try {
      const currentChoices = await fetchChoices(sessionId)
      setChoices(currentChoices)
    } catch (error) {
      console.error('refreshChoices', error)
      setErrorMessage('Error fetching choices. Please reload the page and try again.')
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
    setIsLoading(true)

    try {
      const currentStatus = await fetchStatus(sessionId)
      setStatus(currentStatus)
      if (currentStatus.pageId !== pageId) {
        setIsWaiting(false)
        setPageId(currentStatus.pageId)
        await refreshChoices()
      } else if (currentStatus.current === 'deciding') {
        setIsWaiting(true)
        setTimeout(refreshStatus, delayBetweenRefreshMs)
        return
      }
    } catch (error) {
      console.error('reloadStatus', error)
      setStatus({ address: '', current: 'expired', pageId: 0 })
    }
    setIsLoading(false)
  }

  const renderSession = (): JSX.Element => {
    if (errorMessage) {
      return (
        <>
          <Logo />
          <Alert severity="error">{errorMessage}</Alert>
        </>
      )
    } else if (status?.current === 'expired') {
      return <Expired />
    } else if (loggedInUser === undefined) {
      return (
        <LoginPrompt
          initialUserId={initialUserId}
          setAuthState={setAuthState}
          setLoggedInUser={setLoggedInUser}
          setShowLogin={setShowLogin}
        />
      )
    } else if (status?.current === 'deciding') {
      if (restaurant === undefined) {
        return (
          <>
            <Logo />
            <Typography sx={{ textAlign: 'center' }} variant="h6">
              Loading...
            </Typography>
          </>
        )
      } else {
        return <Deciding address={status.address} makeChoice={makeChoice} restaurant={restaurant} />
      }
    } else if (status?.current === 'winner' && status.winner) {
      return <Winner winner={status.winner} />
    } else if (status?.current === 'finished') {
      return <Finished />
    } else {
      return (
        <>
          <Logo />
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
    if (!restaurant && choices.length === 0) {
      refreshDecisions().then(() => refreshStatus())
    }
  }, [restaurant])

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
