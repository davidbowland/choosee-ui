import { Auth } from 'aws-amplify'
import jsonpatch from 'fast-json-patch'
import React, { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Backdrop from '@mui/material/Backdrop'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import Deciding from './deciding'
import Expired from './expired'
import Finished from './finished'
import LoginPrompt from './login-prompt'
import Owner from './owner'
import Winner from './winner'
import Logo from '@components/logo'
import { fetchChoices, fetchDecision, fetchSession, updateDecision } from '@services/choosee'
import { AmplifyUser, AuthState, Decision, PlaceDetails, SessionData } from '@types'

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
  const [choices, setChoices] = useState<PlaceDetails[]>([])
  const [decision, setDecision] = useState<Decision>({ decisions: {} })
  const [decisionInitial, setDecisionInitial] = useState<Decision>({ decisions: {} })
  const [errorMessage, setErrorMessage] = useState<string | undefined>()
  const [isLoading, setIsLoading] = useState(false)
  const [isWaiting, setIsWaiting] = useState(false)
  const [loggedInUser, setLoggedInUser] = useState<AmplifyUser | undefined>()
  const [place, setPlace] = useState<PlaceDetails | undefined>()
  const [session, setSession] = useState<SessionData>({ status: { current: 'waiting' } } as any)
  const [statusCount, setStatusCount] = useState(0)

  const findNextPlace = (availableChoices: PlaceDetails[]): void => {
    const [firstChoice, ...otherChoices] = availableChoices
    setChoices(otherChoices)
    if (firstChoice.name in decision.decisions) {
      if (otherChoices.length > 0) {
        findNextPlace(otherChoices)
      } else {
        refreshDecisions().then(() => refreshStatus())
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
      console.error('refreshChoices', { choiceId, error })
      setErrorMessage('Error fetching choices. Please reload the page and try again.')
    }
    setIsLoading(false)
  }

  const refreshDecisions = async (): Promise<void> => {
    if (loggedInUser) {
      const jsonPatchOperations = jsonpatch.compare(decisionInitial, decision, true)
      if (jsonPatchOperations.length > 0) {
        try {
          await updateDecision(sessionId, loggedInUser!.attributes!.phone_number, jsonPatchOperations)
          setDecisionInitial(decision)
        } catch (error) {
          console.error('refreshDecisions', { error, jsonPatchOperations, loggedInUser, sessionId })
          setErrorMessage('Error saving decisions. Please reload the page and try again.')
        }
      } else {
        try {
          const currentDecision = await fetchDecision(sessionId, loggedInUser!.attributes!.phone_number)
          setDecision(currentDecision)
          setDecisionInitial(currentDecision)
        } catch (error) {
          console.error('refreshDecisions', { error, loggedInUser, sessionId })
          setErrorMessage('Error fetching decisions. Please reload the page and try again.')
        }
      }
    }
  }

  const refreshStatus = async (): Promise<void> => {
    setIsLoading(true)

    try {
      const currentSession = await fetchSession(sessionId)
      setSession(currentSession)
      if (currentSession.status.current !== session.status.current) {
        setIsWaiting(false)
        await refreshChoices(currentSession.choiceId)
      } else if (currentSession.status.current === 'deciding') {
        setIsWaiting(true)
        if (statusCount < maxStatusRefreshCount) {
          setStatusCount(statusCount + 1)
          setTimeout(refreshStatus, delayBetweenRefreshMs)
        }
      } else {
        setIsLoading(false)
      }
    } catch (error) {
      console.error('refreshStatus', { error })
      setSession({ status: { current: 'expired' } } as any)
    }
  }

  const renderSession = (): JSX.Element => {
    if (errorMessage) {
      return (
        <>
          <Logo />
          <Alert severity="error" variant="filled">
            {errorMessage}
          </Alert>
        </>
      )
    } else if (session?.status.current === 'expired') {
      return <Expired />
    } else if (loggedInUser === undefined) {
      return (
        <Stack spacing={4}>
          <Box>
            <LoginPrompt
              initialUserId={initialUserId}
              setAuthState={setAuthState}
              setLoggedInUser={setLoggedInUser}
              setShowLogin={setShowLogin}
            />
          </Box>
          <Box>
            {session.owner === undefined && (
              <Owner loggedIn={false} session={session} sessionId={sessionId} setSession={setSession} />
            )}
          </Box>
        </Stack>
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
        return (
          <Stack spacing={2}>
            <Box>
              <Deciding address={session.address} makeChoice={makeChoice} place={place} />
            </Box>
            {session.owner === loggedInUser?.attributes?.sub && (
              <Owner loggedIn={!!session.owner} session={session} sessionId={sessionId} setSession={setSession} />
            )}
          </Stack>
        )
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
    Auth.currentAuthenticatedUser()
      .then(setLoggedInUser)
      .catch(() => null)
    refreshStatus()
  }, [])

  useEffect(() => {
    if (
      (place === undefined && choices.length > 0 && loggedInUser) ||
      decision.decisions[place?.name ?? ''] !== undefined
    ) {
      nextPlace()
    }
  }, [choices, decision])

  useEffect(() => {
    refreshDecisions()
  }, [loggedInUser])

  useEffect(() => {
    if (!place && choices.length === 0) {
      refreshDecisions().then(() => refreshStatus())
    }
  }, [place])

  return (
    <>
      {renderSession()}
      <Backdrop
        open={isLoading}
        sx={{ color: '#fff', textAlign: 'center', zIndex: (theme: any) => theme.zIndex.drawer + 1 }}
      >
        <Stack spacing={2} sx={{ m: { sm: '50px', xs: '25px' }, maxWidth: '100%', width: '600px' }}>
          <Box>
            {isWaiting ? (
              <>
                <Typography color="#fff" variant="h5">
                  Voting complete
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
          </Box>
          <Box sx={{ width: '100%' }}>
            <LinearProgress />
          </Box>
          <Box>
            {isWaiting && (
              <div>
                <Typography color="#fff" variant="h6">
                  If other voters aren&apos;t actively voting, you can bookmark this page and come back later.
                </Typography>
              </div>
            )}
          </Box>
        </Stack>
      </Backdrop>
    </>
  )
}

export default Session
