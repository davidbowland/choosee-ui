import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

import ActiveSessions from '@components/active-sessions'
import { useSessionIdentity } from '@hooks/useSessionIdentity'
import * as api from '@services/api'
import '@testing-library/jest-dom'
import { render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionData, User } from '@types'
import { rememberSession } from '@utils/joined-sessions'

// Deliberately NOT mocking @utils/joined-sessions. Every other suite does, which leaves this
// feature's central promise proven only in halves: joined-sessions.test.ts shows dismissSession
// preserves the identity in storage, and useSessionIdentity.test.ts shows the hook reads through
// findJoinedSession — with findJoinedSession itself mocked. Nothing joins the two.
//
// The promise is: dismissing a card clears it from the home page and never costs you your place in
// the Choosee. If it broke, the user would reopen their link, meet "Back again? Choose your name",
// vote as a second person, and split their votes across two identities with no way to merge them.
// A change to readJoinedSessions' or findJoinedSession's contract that broke the pairing would
// leave every other test in the suite green.
jest.mock('@services/api')

const mockedApi = api as jest.Mocked<typeof api>

// The component and the hook both call through to the real module with no injected clock, so the
// system clock is what decides whether a record is inside its 24-hour TTL.
const SYSTEM_TIME = new Date('2026-08-05T12:00:00.000Z')

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

const renderHomePage = (): void => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <ActiveSessions />
    </QueryClientProvider>,
  )
}

describe('dismissing a card and the identity it must not take with it', () => {
  beforeAll(() => {
    jest.useFakeTimers()
    jest.setSystemTime(SYSTEM_TIME)
    mockedApi.fetchSession.mockResolvedValue(session)
    mockedApi.fetchUsers.mockResolvedValue([unvoted])
    mockedApi.hasStatusCode.mockReturnValue(false)
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  const setup = (): void => {
    localStorage.clear()
    rememberSession({
      address: '4102 Main St',
      currentRound: 1,
      sessionId: 'abcd',
      totalRounds: 3,
      userId: 'user-1',
    })
  }

  it('takes the card off the home page and leaves the voter still signed in to the Choosee', async () => {
    setup()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    renderHomePage()

    expect(await screen.findByText('4102 Main St')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /dismiss/i }))
    await waitFor(() => expect(screen.queryByText('4102 Main St')).not.toBeInTheDocument())

    // Reopening the Choosee's own link. This is the assertion the whole flag-don't-delete design
    // exists to make true.
    const { result } = renderHook(() => useSessionIdentity('abcd'))
    expect(result.current.userId).toBe('user-1')
  })

  it('keeps the card off the home page on the next visit', async () => {
    setup()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    renderHomePage()

    expect(await screen.findByText('4102 Main St')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /dismiss/i }))
    await waitFor(() => expect(screen.queryByText('4102 Main St')).not.toBeInTheDocument())

    renderHomePage()

    expect(screen.queryByText('Pick back up')).not.toBeInTheDocument()
  })
})
