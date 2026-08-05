import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

import ActiveSessions from '@components/active-sessions'
import * as api from '@services/api'
import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChoicesMap, SessionData, User } from '@types'
import * as joinedSessions from '@utils/joined-sessions'

jest.mock('@services/api')
jest.mock('@utils/joined-sessions')

const mockedApi = api as jest.Mocked<typeof api>
const mockedStore = joinedSessions as jest.Mocked<typeof joinedSessions>

const entry: joinedSessions.JoinedSession = {
  address: '4102 Main St',
  currentRound: 1,
  joinedAt: 1_700_000_000_000,
  sessionId: 'abcd',
  totalRounds: 3,
  userId: 'user-1',
}

const session: SessionData = {
  address: '4102 Main St',
  bracket: [[['a', 'b']], [['a', 'c']]],
  byes: [null, null],
  currentRound: 1,
  errorMessage: null,
  exclude: [],
  filterClosingSoon: false,
  isReady: true,
  location: { latitude: 0, longitude: 0 },
  radius: 5000,
  rankBy: 'DISTANCE',
  sessionId: 'abcd',
  totalRounds: 3,
  type: ['restaurant'],
  users: ['user-1'],
  voterCount: 4,
  votersSubmitted: 2,
  winner: null,
}

const unvoted: User = { name: 'Dana', userId: 'user-1', votes: [['a'], []] }
const voted: User = { name: 'Dana', userId: 'user-1', votes: [['a'], ['a']] }
const choices: ChoicesMap = { 'choice-1': { choiceId: 'choice-1', name: 'Gates Bar-B-Q', photos: [] } }

const renderComponent = (): void => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <ActiveSessions />
    </QueryClientProvider>,
  )
}

describe('ActiveSessions', () => {
  beforeAll(() => {
    mockedStore.readJoinedSessions.mockReturnValue([entry])
    mockedApi.fetchSession.mockResolvedValue(session)
    mockedApi.fetchUsers.mockResolvedValue([unvoted])
    mockedApi.fetchChoices.mockResolvedValue(choices)
    // The 404 signal is keyed off the rejection a test supplies rather than a per-test
    // mockReturnValue: clearMocks clears calls, not implementations, so an override set inside one
    // test would still be in force for every test after it.
    mockedApi.hasStatusCode.mockImplementation((err) => (err as Error | undefined)?.message === 'gone')
  })

  it('renders nothing when no Choosees are remembered', () => {
    mockedStore.readJoinedSessions.mockReturnValueOnce([])

    renderComponent()

    expect(screen.queryByText(/Pick back up/i)).not.toBeInTheDocument()
  })

  it('shows the address before the network answers', async () => {
    renderComponent()

    expect(screen.getByText('4102 Main St')).toBeInTheDocument()
    await screen.findByText(/Your turn/i)
  })

  // The spec's First paint rule: the round is local data, so it must not wait on a request. On a
  // failing connection this line is the difference between a useful card and a pulsing bar.
  it('shows the cached round before the network answers', async () => {
    renderComponent()

    expect(screen.getByText(/Round 2 of 3/i)).toBeInTheDocument()
    await screen.findByText(/Your turn/i)
  })

  it('announces your turn when a vote is outstanding', async () => {
    renderComponent()

    expect(await screen.findByText(/Your turn — round 2 of 3/i)).toBeInTheDocument()
  })

  it('reports the vote count when waiting on other people', async () => {
    mockedApi.fetchUsers.mockResolvedValueOnce([voted])

    renderComponent()

    expect(await screen.findByText(/Round 2 of 3 — 2 of 4 voted/i)).toBeInTheDocument()
  })

  it('names the winner once a Choosee has finished', async () => {
    mockedApi.fetchSession.mockResolvedValueOnce({ ...session, winner: 'choice-1' })

    renderComponent()

    expect(await screen.findByText(/Gates Bar-B-Q won/i)).toBeInTheDocument()
  })

  it('says a winner is picked while its name is still unknown', async () => {
    mockedApi.fetchSession.mockResolvedValueOnce({ ...session, winner: 'choice-1' })
    mockedApi.fetchChoices.mockRejectedValueOnce(new Error('offline'))

    renderComponent()

    expect(await screen.findByText(/Winner picked/i)).toBeInTheDocument()
  })

  it('forgets a Choosee the server no longer has', async () => {
    mockedApi.fetchSession.mockRejectedValueOnce(new Error('gone'))

    renderComponent()

    await waitFor(() => expect(mockedStore.forgetSession).toHaveBeenCalledWith('abcd'))
    expect(screen.queryByText('4102 Main St')).not.toBeInTheDocument()
  })

  it('keeps the card when the request fails for any other reason', async () => {
    mockedApi.fetchSession.mockRejectedValueOnce(new Error('offline'))

    renderComponent()

    await waitFor(() => expect(mockedApi.hasStatusCode).toHaveBeenCalledWith(expect.any(Error), 404))
    expect(screen.getByText('4102 Main St')).toBeInTheDocument()
    expect(mockedStore.forgetSession).not.toHaveBeenCalled()
  })

  it('removes a dismissed card and records the dismissal', async () => {
    renderComponent()
    await screen.findByText(/Your turn/i)

    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }))

    expect(mockedStore.dismissSession).toHaveBeenCalledWith('abcd')
    expect(screen.queryByText('4102 Main St')).not.toBeInTheDocument()
  })

  it('links each card to its Choosee', async () => {
    renderComponent()

    expect(await screen.findByRole('link', { name: /4102 Main St/i })).toHaveAttribute('href', '/s/abcd')
  })
})
