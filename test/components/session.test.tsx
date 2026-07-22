import { toast } from '@heroui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// @ts-expect-error — mock-only export from __mocks__/index.tsx
import { mockSetAuthState } from '@components/auth-context'
import Session from '@components/session'
import * as api from '@services/api'
import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChoicesMap, SessionData, User } from '@types'

jest.mock('@services/api')
jest.mock('@components/auth-context')

jest.mock('@heroui/react', () => ({
  ...jest.requireActual('@heroui/react'),
  toast: Object.assign(jest.fn(), { danger: jest.fn(), info: jest.fn(), success: jest.fn(), warning: jest.fn() }),
}))

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
  default: () => <div data-testid="voting-phase">Voting</div>,
}))
jest.mock('@components/session/waiting', () => ({
  __esModule: true,
  default: () => <div data-testid="waiting-phase">Waiting</div>,
}))
jest.mock('@components/session/winner', () => ({
  __esModule: true,
  default: () => <div data-testid="winner-phase">Winner</div>,
}))

// Mock cookie hook
let mockUserId: string | null = null
const mockSetUserId = jest.fn()
jest.mock('@hooks/useSessionCookie', () => ({
  useSessionCookie: () => ({ userId: mockUserId, setUserId: mockSetUserId }),
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
  subscribedRounds: [],
  votes: [[null]],
  textsSent: 0,
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

describe('Session', () => {
  afterEach(async () => {
    await queryClient?.cancelQueries()
    queryClient?.clear()
  })

  beforeEach(() => {
    mockUserId = null
    mockSetUserId.mockClear()
  })

  it('should show loading phase when session is not yet loaded', () => {
    const resolve = jest.fn()
    jest.mocked(api.fetchSession).mockReturnValue(new Promise((r) => resolve.mockImplementation(r)))
    renderWithClient(<Session sessionId="test-session" />)
    expect(screen.getByTestId('loading-phase')).toBeInTheDocument()
    resolve(baseSession)
  })

  it('should show loading phase when session is not ready', async () => {
    jest.mocked(api.fetchSession).mockResolvedValue({ ...baseSession, isReady: false })
    renderWithClient(<Session sessionId="test-session" />)
    await waitFor(() => expect(screen.getByTestId('loading-phase')).toBeInTheDocument())
  })

  it('should show error phase when session has error', async () => {
    jest.mocked(api.fetchSession).mockResolvedValue({
      ...baseSession,
      isReady: false,
      errorMessage: 'Something broke',
    })
    renderWithClient(<Session sessionId="test-session" />)
    await waitFor(() => expect(screen.getByText('Something broke')).toBeInTheDocument())
  })

  it('should show contextual closing-soon error when session error mentions closing-soon filter', async () => {
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
    jest.mocked(api.fetchSession).mockResolvedValue({ ...baseSession, winner: 'a' })
    jest.mocked(api.fetchChoices).mockResolvedValue(mockChoices)
    jest.mocked(api.fetchUsers).mockResolvedValue([mockUser])
    renderWithClient(<Session sessionId="test-session" />)
    await waitFor(() => expect(screen.getByTestId('winner-phase')).toBeInTheDocument())
  })

  it('should show user-select phase when no user is identified', async () => {
    jest.mocked(api.fetchSession).mockResolvedValue(baseSession)
    jest.mocked(api.fetchUsers).mockResolvedValue([mockUser])
    jest.mocked(api.fetchChoices).mockResolvedValue(mockChoices)
    renderWithClient(<Session sessionId="test-session" />)
    await waitFor(() => expect(screen.getByTestId('user-select-phase')).toBeInTheDocument())
  })

  it('should show voting phase when user has unvoted matchups', async () => {
    mockUserId = 'user-1'
    jest.mocked(api.fetchSession).mockResolvedValue(baseSession)
    jest.mocked(api.fetchUsers).mockResolvedValue([mockUser])
    jest.mocked(api.fetchChoices).mockResolvedValue(mockChoices)
    renderWithClient(<Session sessionId="test-session" />)
    await waitFor(() => expect(screen.getByTestId('voting-phase')).toBeInTheDocument())
  })

  it('should show waiting phase when user has voted all matchups', async () => {
    mockUserId = 'user-1'
    const votedUser = { ...mockUser, votes: [['a']] }
    jest.mocked(api.fetchSession).mockResolvedValue(baseSession)
    jest.mocked(api.fetchUsers).mockResolvedValue([votedUser])
    jest.mocked(api.fetchChoices).mockResolvedValue(mockChoices)
    renderWithClient(<Session sessionId="test-session" />)
    await waitFor(() => expect(screen.getByTestId('waiting-phase')).toBeInTheDocument())
  })

  it('should use query param id when available', async () => {
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
    jest.mocked(api.fetchSession).mockResolvedValue({
      ...baseSession,
      isReady: false,
      errorMessage: null,
    })
    renderWithClient(<Session sessionId="test-session" />)
    // This should show loading since errorMessage is null and isReady is false
    await waitFor(() => expect(screen.getByTestId('loading-phase')).toBeInTheDocument())
  })

  it('should prefer cookie userId over nothing', async () => {
    mockUserId = 'user-1'
    const votedUser = { ...mockUser, votes: [['a']] }
    jest.mocked(api.fetchSession).mockResolvedValue(baseSession)
    jest.mocked(api.fetchUsers).mockResolvedValue([votedUser])
    jest.mocked(api.fetchChoices).mockResolvedValue(mockChoices)
    renderWithClient(<Session sessionId="test-session" />)
    await waitFor(() => expect(screen.getByTestId('waiting-phase')).toBeInTheDocument())
  })

  it('should ignore cookie userId if not in users list', async () => {
    mockUserId = 'nonexistent-user'
    jest.mocked(api.fetchSession).mockResolvedValue(baseSession)
    jest.mocked(api.fetchUsers).mockResolvedValue([mockUser])
    jest.mocked(api.fetchChoices).mockResolvedValue(mockChoices)
    renderWithClient(<Session sessionId="test-session" />)
    await waitFor(() => expect(screen.getByTestId('user-select-phase')).toBeInTheDocument())
  })

  it('should handle user selection callback', async () => {
    jest.mocked(api.fetchSession).mockResolvedValue(baseSession)
    jest.mocked(api.fetchUsers).mockResolvedValue([mockUser])
    jest.mocked(api.fetchChoices).mockResolvedValue(mockChoices)
    const user = userEvent.setup()
    renderWithClient(<Session sessionId="test-session" />)
    await waitFor(() => expect(screen.getByTestId('user-select-phase')).toBeInTheDocument())
    await user.click(screen.getByText('Select user'))
    expect(mockSetUserId).toHaveBeenCalledWith('user-1')
  })

  describe('phone verification via ?pin=', () => {
    // This jsdom setup redefines window.location instead of honoring replaceState
    // (see the ?id= test above), so set the URL the same way here.
    const setUrl = (search: string): void => {
      Object.defineProperty(window, 'location', {
        value: { ...window.location, search, pathname: '/s/test-session' },
        writable: true,
      })
    }
    const restoreUrl = (): void => setUrl('')

    it('verifies the pin and shows a success toast when signed in', async () => {
      sessionStorage.clear()
      setUrl('?pin=123456')
      const replaceStateSpy = jest.spyOn(window.history, 'replaceState')
      mockSetAuthState({ isSignedIn: true })
      jest.mocked(api.fetchSession).mockResolvedValue(baseSession)
      jest.mocked(api.verifyPhone).mockResolvedValue({ verified: true, locked: false })

      renderWithClient(<Session sessionId="test-session" />)

      await waitFor(() => expect(api.verifyPhone).toHaveBeenCalledWith('123456'))
      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith('Your number is verified — you can now turn on round reminders.'),
      )
      expect(replaceStateSpy).toHaveBeenCalled() // pin stripped from the URL
      replaceStateSpy.mockRestore()
      restoreUrl()
    })

    it('stashes the pin and triggers sign-in when signed out', async () => {
      sessionStorage.clear()
      setUrl('?pin=654321')
      const handleSignIn = jest.fn()
      mockSetAuthState({ isSignedIn: false, handleSignIn })
      jest.mocked(api.fetchSession).mockResolvedValue(baseSession)

      renderWithClient(<Session sessionId="test-session" />)

      await waitFor(() => expect(handleSignIn).toHaveBeenCalled())
      expect(sessionStorage.getItem('choosee_pending_pin')).toBe('654321')
      expect(api.verifyPhone).not.toHaveBeenCalled()
      restoreUrl()
    })

    it('verifies a stashed pin after returning signed in', async () => {
      restoreUrl()
      sessionStorage.setItem('choosee_pending_pin', '111222')
      mockSetAuthState({ isSignedIn: true })
      jest.mocked(api.fetchSession).mockResolvedValue(baseSession)
      jest.mocked(api.verifyPhone).mockResolvedValue({ verified: false, locked: false, attemptsRemaining: 5 })

      renderWithClient(<Session sessionId="test-session" />)

      await waitFor(() => expect(api.verifyPhone).toHaveBeenCalledWith('111222'))
      await waitFor(() => expect(toast.warning).toHaveBeenCalledWith("That code didn't match. 5 tries left."))
      expect(sessionStorage.getItem('choosee_pending_pin')).toBeNull()
    })
  })
})
