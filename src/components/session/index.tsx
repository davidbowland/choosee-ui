import React, { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import { Auth } from 'aws-amplify'
import Backdrop from '@mui/material/Backdrop'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import jsonpatch from 'fast-json-patch'

import { AuthState, CognitoUserAmplify, Decision, Place, SessionData } from '@types'
import { fetchDecision, fetchSession, updateDecisions } from '@services/sessions'
import Deciding from './deciding'
import Expired from './expired'
import Finished from './finished'
import LoginPrompt from './login-prompt'
import Logo from '@components/logo'
import Winner from './winner'
import { fetchChoices } from '@services/maps'

const MAX_STATUS_REFRESH_COUNT = 50
const delayBetweenRefreshMs = parseInt(process.env.GATSBY_DELAY_BETWEEN_REFRESH_MS, 10)

export interface SessionProps {
  initialUserId?: string
  maxStatusRefreshCount?: number
  sessionId: string
  setAuthState: (value: AuthState) => void
  setShowLogin: (value: boolean) => void
}

const Session = ({
  initialUserId,
  maxStatusRefreshCount = MAX_STATUS_REFRESH_COUNT,
  sessionId,
  setAuthState,
  setShowLogin,
}: SessionProps): JSX.Element => {
  const [choices, setChoices] = useState<Place[]>([])
  const [decision, setDecision] = useState<Decision>({decisions: {}})
  const [decisionInitial, setDecisionInitial] = useState<Decision>({decisions: {}})
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [isWaiting, setIsWaiting] = useState(false)
  const [loggedInUser, setLoggedInUser] = useState<CognitoUserAmplify | undefined>(undefined)
  const [pageId, setPageId] = useState(-2)
  const [place, setPlace] = useState<Place | undefined>(undefined)
  const [session, setSession] = useState<SessionData>({ status: { current: 'deciding', pageId: -1 } } as any)
  const [statusCount, setStatusCount] = useState(0)

  const findNextPlace = (availableChoices: Place[]): void => {
    const [firstChoice, ...otherChoices] = availableChoices
    setChoices(otherChoices)
    if (firstChoice.name in decision.decisions) {
      if (otherChoices.length > 0) {
        findNextPlace(otherChoices)
      } else {
        refreshDecisions().then(refreshStatus)
      }
    } else {
      setPlace(firstChoice)
    }
  }

  const makeChoice = (name: string, value: boolean): void => {
    setDecision({ ...decision, decisions: { ...decision.decisions, [name]: value } })
  }

  const nextPlace = async (): Promise<void> => {
    setPlace(undefined)
    if (choices.length > 0) {
      findNextPlace(choices)
    }
  }
  const refreshChoices = async (choiceId: string): Promise<void> => {
    try {
      const currentChoices = await fetchChoices(choiceId)
      setChoices(currentChoices)
    } catch (error) {
      console.error('refreshChoices', error)
      setErrorMessage('Error fetching choices. Please reload the page and try again.')
    }
  }

  const refreshDecisions = async () => {
    if (loggedInUser) {
      const jsonPatchOperations = jsonpatch.compare(decisionInitial, decision, true)
      if (jsonPatchOperations.length > 0) {
        await updateDecisions(sessionId, loggedInUser!.attributes!.phone_number, jsonPatchOperations)
        setDecisionInitial(decision)
      } else {
        const currentDecision = await fetchDecision(sessionId, loggedInUser!.attributes!.phone_number)
        setDecision(currentDecision)
        setDecisionInitial(currentDecision)
      }
    }
  }

  const refreshStatus = async (): Promise<void> => {
    setIsLoading(true)

    try {
      const currentSession = await fetchSession(sessionId)
      setSession(currentSession)
      if (currentSession.status.pageId !== pageId) {
        setIsWaiting(false)
        setPageId(currentSession.status.pageId)
        await refreshChoices(currentSession.choiceId)
      } else if (currentSession.status.current === 'deciding') {
        setIsWaiting(true)
        if (statusCount < maxStatusRefreshCount) {
          setStatusCount(statusCount + 1)
          setTimeout(refreshStatus, delayBetweenRefreshMs)
        }
        return
      }
    } catch (error) {
      console.error('reloadStatus', error)
      setSession({ status: { current: 'expired', pageId: 0 } } as any)
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
    } else if (session?.status.current === 'expired') {
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
    } else if (session?.status.current === 'deciding') {
      if (place === undefined) {
        return (
          <>
            <Logo />
            {!isLoading && (
              <Typography sx={{ textAlign: 'center' }} variant="h6">
                Loading...
              </Typography>
            )}
          </>
        )
      } else {
        return <Deciding address={session.address} makeChoice={makeChoice} place={place} />
      }
    } else if (session?.status.current === 'winner' && session.status.winner) {
      return <Winner winner={session.status.winner} />
    } else if (session?.status.current === 'finished') {
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
    if (place === undefined && choices.length > 0 && loggedInUser) {
      nextPlace()
    }
  }, [choices])

  useEffect(() => {
    nextPlace()
  }, [decision])

  useEffect(() => {
    refreshDecisions()
  }, [loggedInUser])

  useEffect(() => {
    if (!place && choices.length === 0) {
      refreshDecisions().then(() => refreshStatus())
    }
  }, [place])

  useEffect(() => {
    Auth.currentAuthenticatedUser()
      .then(setLoggedInUser)
      .catch(() => null)
    refreshStatus()
  }, [])

  return (
    <>
      {renderSession()}
      <Backdrop
        open={isLoading}
        sx={{ color: '#fff', textAlign: 'center', zIndex: (theme: any) => theme.zIndex.drawer + 1 }}
      >
        <Stack margin="auto" maxWidth="400px" spacing={2}>
          {isWaiting ? (
            <>
              <Typography color="#fff" variant="h5">
                Round {pageId + 1} complete
              </Typography>
              <Typography color="#fff" variant="h5">
                {statusCount < maxStatusRefreshCount ? 'Waiting for other voters' : 'Please refresh the page'}
              </Typography>
            </>
          ) : (
            <Typography color="#fff" variant="h5">
              Loading
            </Typography>
          )}
          <div style={{ textAlign: 'center' }}>
            <CircularProgress color="inherit" />
          </div>
          {isWaiting && (
            <div>
              <Typography color="#fff" variant="h6">
                If other voters aren&apos;t actively voting, you can bookmark this page and come back later.
              </Typography>
            </div>
          )}
        </Stack>
      </Backdrop>
    </>
  )
}

export default Session
