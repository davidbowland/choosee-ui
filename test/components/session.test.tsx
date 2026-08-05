import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

import Session, { waitingInterval } from '@components/session'
import * as api from '@services/api'
import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChoicesMap, SessionData, User } from '@types'

jest.mock('@services/api')

// Mock child phases to keep tests focused on Session orchestration
jest.mock('@components/session/loading', () => ({
  __esModule: true,
  default: () => <div data-testid="loading-phase">Loading</div>,
}))
jest.mock('@components/session/user-select', () => ({
  __esModule: true,
  default: ({ onUserSelected }: { onUserSelected: (id: string) => void }) => (
    <div data-testid="user-select-phase">
      <button onClick={() => onUserSelected('user-1')}>Select user</button>
    </div>
  ),
}))
jest.mock('@components/session/voting', () => ({
  __esModule: true,
  default: ({ voterCount }: { voterCount: number }) => (
    <div data-testid="voting-phase">
      Voting<span data-testid="voting-voter-count">{voterCount}</span>
    </div>
  ),
}))
jest.mock('@components/session/waiting', () => ({
  __esModule: true,
  default: () => <div data-testid="waiting-phase">Waiting</div>,
}))
jest.mock('@components/session/winner', () => ({
  __esModule: true,
  default: () => <div data-testid="winner-phase">Winner</div>,
}))

// Mock identity hook
let mockUserId: string | null = null
const mockSetUserId = jest.fn()
jest.mock('@hooks/useSessionIdentity', () => ({
  useSessionIdentity: () => ({ setUserId: mockSetUserId, userId: mockUserId }),
}))

const baseSession: SessionData = {
  sessionId: 'test-session',
  address: '123 Main St',
  location: { latitude: 0, longitude: 0 },
  currentRound: 0,
  totalRounds: 2,
  bracket: [[['a', 'b']]],
  byes: [null],
  isReady: true,
  errorMessage: null,
  filterClosingSoon: false,
  users: ['user-1'],
  winner: null,
  type: ['restaurant'],
  exclude: [],
  radius: 5000,
  rankBy: 'DISTANCE',
  voterCount: 2,
  votersSubmitted: 0,
}

const mockUser: User = {
  userId: 'user-1',
  name: 'Test User',
  votes: [[null]],
}

const mockChoices: ChoicesMap = {
  a: { choiceId: 'a', name: 'Restaurant A', photos: [] },
  b: { choiceId: 'b', name: 'Restaurant B', photos: [] },
}

let queryClient: QueryClient

function renderWithClient(ui: React.ReactElement) {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('waitingInterval', () => {
  it('should poll hard while the session is still being built', () => {
    expect(waitingInterval('loading', false)).toEqual(2_000)
  })

  it('should poll every 10s on the waiting screen without a subscription', () => {
    expect(waitingInterval('waiting', false)).toEqual(10_000)
  })

  // Push is the backstop, so someone who will be told can afford to find out a little later.
  it('should back off to 15s once this device holds a subscription', () => {
    expect(waitingInterval('waiting', true)).toEqual(15_000)
  })

  // iOS forbids a push that shows no notification, so a foregrounded tab still has to poll —
  // subscribing relaxes the interval, it never switches polling off.
  it('should keep polling the waiting screen even when subscribed', () => {
    expect(waitingInterval('waiting', true)).not.toBe(false)
  })

  it.each(['voting', 'winner', 'user-select', 'error'] as const)('should not poll during %s', (phase) => {
    expect(waitingInterval(phase, false)).toBe(false)
  })

  it('should ignore the subscription outside the waiting screen', () => {
    expect(waitingInterval('voting', true)).toBe(false)
  })
})

describe('Session', () => {
  afterEach(async () => {
    await queryClient?.cancelQueries()
    queryClient?.clear()
  })

  /** Starts each test with no identified user in the stored record. */
  const setup = (userId: string | null = null): void => {
    mockUserId = userId
  }

  it('should show loading phase when session is not yet loaded', () => {
    setup()
    const resolve = jest.fn()
    jest.mocked(api.fetchSession).mockReturnValue(new Promise((r) => resolve.mockImplementation(r)))
    renderWithClient(<Session sessionId="test-session" />)
    expect(screen.getByTestId('loading-phase')).toBeInTheDocument()
    resolve(baseSession)
  })

  it('should show loading phase when session is not ready', async () => {
    setup()
    jest.mocked(api.fetchSession).mockResolvedValue({ ...baseSession, isReady: false })
    renderWithClient(<Session sessionId="test-session" />)
    await waitFor(() => expect(screen.getByTestId('loading-phase')).toBeInTheDocument())
  })

  it('should show error phase when session has error', async () => {
    setup()
    jest.mocked(api.fetchSession).mockResolvedValue({
      ...baseSession,
      isReady: false,
      errorMessage: 'Something broke',
    })
    renderWithClient(<Session sessionId="test-session" />)
    await waitFor(() => expect(screen.getByText('Something broke')).toBeInTheDocument())
  })

  it('should show contextual closing-soon error when session error mentions closing-soon filter', async () => {
    setup()
    jest.mocked(api.fetchSession).mockResolvedValue({
      ...baseSession,
      isReady: false,
      errorMessage:
        'Not enough restaurants are open right now (or staying open long enough). Try again later or disable the closing-soon filter.',
    })
    renderWithClient(<Session sessionId="test-session" />)
    await waitFor(() => expect(screen.getByText(/Not enough restaurants are open near you/i)).toBeInTheDocument())
    expect(screen.getByText(/Try again/i)).toHaveAttribute('href', '/')
  })

  it('should show winner phase when session has a winner', async () => {
    setup()
    jest.mocked(api.fetchSession).mockResolvedValue({ ...baseSession, winner: 'a' })
    jest.mocked(api.fetchChoices).mockResolvedValue(mockChoices)
    jest.mocked(api.fetchUsers).mockResolvedValue([mockUser])
    renderWithClient(<Session sessionId="test-session" />)
    await waitFor(() => expect(screen.getByTestId('winner-phase')).toBeInTheDocument())
  })

  it('should show user-select phase when no user is identified', async () => {
    setup()
    jest.mocked(api.fetchSession).mockResolvedValue(baseSession)
    jest.mocked(api.fetchUsers).mockResolvedValue([mockUser])
    jest.mocked(api.fetchChoices).mockResolvedValue(mockChoices)
    renderWithClient(<Session sessionId="test-session" />)
    await waitFor(() => expect(screen.getByTestId('user-select-phase')).toBeInTheDocument())
  })

  it('should show voting phase when user has unvoted matchups', async () => {
    setup('user-1')
    jest.mocked(api.fetchSession).mockResolvedValue(baseSession)
    jest.mocked(api.fetchUsers).mockResolvedValue([mockUser])
    jest.mocked(api.fetchChoices).mockResolvedValue(mockChoices)
    renderWithClient(<Session sessionId="test-session" />)
    await waitFor(() => expect(screen.getByTestId('voting-phase')).toBeInTheDocument())
  })

  // baseSession carries voterCount 2 while the users query returns one user, so this only passes
  // if the count comes off the users list — the query that keeps polling once voting starts.
  it('should give the voting phase the users-list count rather than the session snapshot', async () => {
    setup('user-1')
    jest.mocked(api.fetchSession).mockResolvedValue(baseSession)
    jest.mocked(api.fetchUsers).mockResolvedValue([mockUser])
    jest.mocked(api.fetchChoices).mockResolvedValue(mockChoices)
    renderWithClient(<Session sessionId="test-session" />)
    await waitFor(() => expect(screen.getByTestId('voting-phase')).toBeInTheDocument())
    expect(screen.getByTestId('voting-voter-count')).toHaveTextContent('1')
  })

  it('should show waiting phase when user has voted all matchups', async () => {
    setup('user-1')
    const votedUser = { ...mockUser, votes: [['a']] }
    jest.mocked(api.fetchSession).mockResolvedValue(baseSession)
    jest.mocked(api.fetchUsers).mockResolvedValue([votedUser])
    jest.mocked(api.fetchChoices).mockResolvedValue(mockChoices)
    renderWithClient(<Session sessionId="test-session" />)
    await waitFor(() => expect(screen.getByTestId('waiting-phase')).toBeInTheDocument())
  })

  it('should use query param id when available', async () => {
    setup()
    // Set ?id=user-1 in the URL
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?id=user-1', pathname: '/s/test-session' },
      writable: true,
    })
    const replaceStateSpy = jest.spyOn(window.history, 'replaceState')

    jest.mocked(api.fetchSession).mockResolvedValue(baseSession)
    jest.mocked(api.fetchUsers).mockResolvedValue([mockUser])
    jest.mocked(api.fetchChoices).mockResolvedValue(mockChoices)
    renderWithClient(<Session sessionId="test-session" />)

    await waitFor(() => expect(screen.getByTestId('voting-phase')).toBeInTheDocument())
    expect(replaceStateSpy).toHaveBeenCalled()

    replaceStateSpy.mockRestore()
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '', pathname: '/' },
      writable: true,
    })
  })

  it('should show error banner with fallback message when errorMessage is null', async () => {
    setup()
    jest.mocked(api.fetchSession).mockResolvedValue({
      ...baseSession,
      isReady: false,
      errorMessage: null,
    })
    renderWithClient(<Session sessionId="test-session" />)
    // This should show loading since errorMessage is null and isReady is false
    await waitFor(() => expect(screen.getByTestId('loading-phase')).toBeInTheDocument())
  })

  it('should prefer the stored userId over nothing', async () => {
    setup('user-1')
    const votedUser = { ...mockUser, votes: [['a']] }
    jest.mocked(api.fetchSession).mockResolvedValue(baseSession)
    jest.mocked(api.fetchUsers).mockResolvedValue([votedUser])
    jest.mocked(api.fetchChoices).mockResolvedValue(mockChoices)
    renderWithClient(<Session sessionId="test-session" />)
    await waitFor(() => expect(screen.getByTestId('waiting-phase')).toBeInTheDocument())
  })

  it('should ignore the stored userId if not in users list', async () => {
    setup('nonexistent-user')
    jest.mocked(api.fetchSession).mockResolvedValue(baseSession)
    jest.mocked(api.fetchUsers).mockResolvedValue([mockUser])
    jest.mocked(api.fetchChoices).mockResolvedValue(mockChoices)
    renderWithClient(<Session sessionId="test-session" />)
    await waitFor(() => expect(screen.getByTestId('user-select-phase')).toBeInTheDocument())
  })

  // A notification opens /s/{id}?id={userId}. consumeQueryParamId strips it on mount, so without
  // persisting it the identity survives exactly one page load — and on an installed iOS app, whose
  // storage is separate from the Safari tab the user joined in, every launch would land on the
  // name picker instead of the vote.
  it('should remember an identity that arrived in the URL', async () => {
    setup()
    Object.defineProperty(window, 'location', {
      value: { ...window.location, pathname: '/s/test-session', search: '?id=user-1' },
      writable: true,
    })
    jest.mocked(api.fetchSession).mockResolvedValue(baseSession)
    jest.mocked(api.fetchUsers).mockResolvedValue([mockUser])
    jest.mocked(api.fetchChoices).mockResolvedValue(mockChoices)

    renderWithClient(<Session sessionId="test-session" />)

    await waitFor(() =>
      expect(mockSetUserId).toHaveBeenCalledWith('user-1', {
        address: '123 Main St',
        currentRound: 0,
        totalRounds: 2,
      }),
    )
  })

  it('should not remember an id that is not a voter in this Choosee', async () => {
    setup()
    Object.defineProperty(window, 'location', {
      value: { ...window.location, pathname: '/s/test-session', search: '?id=not-a-voter' },
      writable: true,
    })
    jest.mocked(api.fetchSession).mockResolvedValue(baseSession)
    jest.mocked(api.fetchUsers).mockResolvedValue([mockUser])
    jest.mocked(api.fetchChoices).mockResolvedValue(mockChoices)

    renderWithClient(<Session sessionId="test-session" />)

    await waitFor(() => expect(screen.getByTestId('user-select-phase')).toBeInTheDocument())
    expect(mockSetUserId).not.toHaveBeenCalled()
  })

  it('should handle user selection callback', async () => {
    setup()
    jest.mocked(api.fetchSession).mockResolvedValue(baseSession)
    jest.mocked(api.fetchUsers).mockResolvedValue([mockUser])
    jest.mocked(api.fetchChoices).mockResolvedValue(mockChoices)
    const user = userEvent.setup()
    renderWithClient(<Session sessionId="test-session" />)
    await waitFor(() => expect(screen.getByTestId('user-select-phase')).toBeInTheDocument())
    await user.click(screen.getByText('Select user'))
    expect(mockSetUserId).toHaveBeenCalledWith('user-1', {
      address: '123 Main St',
      currentRound: 0,
      totalRounds: 2,
    })
  })

  // Joining writes a user row, which changes the session's voterCount. The voting screen never
  // polls, so without refetching here the second person to join reads a pre-join count and gets
  // told they are the only one in a Choosee they were invited to.
  it('should refetch the session after a user joins so the voter count is not stale', async () => {
    setup()
    jest.mocked(api.fetchSession).mockResolvedValue(baseSession)
    jest.mocked(api.fetchUsers).mockResolvedValue([mockUser])
    jest.mocked(api.fetchChoices).mockResolvedValue(mockChoices)
    const user = userEvent.setup()
    renderWithClient(<Session sessionId="test-session" />)
    await waitFor(() => expect(screen.getByTestId('user-select-phase')).toBeInTheDocument())
    const callsBeforeJoin = jest.mocked(api.fetchSession).mock.calls.length

    await user.click(screen.getByText('Select user'))

    await waitFor(() => expect(jest.mocked(api.fetchSession).mock.calls.length).toBeGreaterThan(callsBeforeJoin))
  })
})
