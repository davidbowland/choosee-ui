import { toast } from '@heroui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// @ts-expect-error — mock-only export from __mocks__/index.tsx
import { mockSetAuthState } from '@components/auth-context'
import WaitingPhase from '@components/session/waiting'
import { useProfile } from '@hooks/useProfile'
import * as api from '@services/api'
import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChoicesMap, Profile, SessionData, User } from '@types'

jest.mock('@components/auth-context')
jest.mock('@services/api')
jest.mock('@hooks/useProfile')

const setProfile = jest.fn()
const mockProfile = (profile: Profile) =>
  jest.mocked(useProfile).mockReturnValue({ profile, isLoading: false, setProfile })
const setupSignedIn = (profile: Profile): void => {
  mockSetAuthState({ isSignedIn: true })
  mockProfile(profile)
}

jest.mock('@heroui/react', () => ({
  ...jest.requireActual('@heroui/react'),
  toast: Object.assign(jest.fn(), { danger: jest.fn(), info: jest.fn(), success: jest.fn(), warning: jest.fn() }),
}))

// Mock BracketView to verify open/close
jest.mock('@components/bracket-view', () => ({
  __esModule: true,
  default: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div data-testid="bracket-view">
        <button onClick={onClose}>Close bracket</button>
      </div>
    ) : null,
}))

const mockSession: SessionData = {
  sessionId: 'test-session',
  address: '123 Main St',
  location: { latitude: 0, longitude: 0 },
  currentRound: 0,
  totalRounds: 3,
  bracket: [[['a', 'b']]],
  byes: [null],
  isReady: true,
  errorMessage: null,
  filterClosingSoon: false,
  users: ['user-1', 'user-2'],
  winner: null,
  type: ['restaurant'],
  exclude: [],
  radius: 5000,
  rankBy: 'DISTANCE',
  voterCount: 2,
  votersSubmitted: 1,
}

const doneUser: User = {
  userId: 'user-1',
  name: 'Done User',
  subscribedRounds: [],
  votes: [['a']],
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

const defaultProps = {
  choices: mockChoices,
  currentUser: doneUser,
  session: mockSession,
  sessionId: 'test-session',
}

describe('WaitingPhase', () => {
  beforeEach(() => {
    mockSetAuthState({ isSignedIn: true })
    mockProfile({ verified: true, phoneLast4: '4567', consent: true })
    jest.mocked(toast.info).mockClear()
    jest.mocked(toast.danger).mockClear()
  })

  it('should display voting progress', () => {
    renderWithClient(<WaitingPhase {...defaultProps} />)
    expect(screen.getByText(/Voted/i)).toBeInTheDocument()
    expect(screen.getByText(/1/)).toBeInTheDocument()
    expect(screen.getByText(/Waiting for others to finish voting/i)).toBeInTheDocument()
  })

  it('should display the skip-ahead link', () => {
    renderWithClient(<WaitingPhase {...defaultProps} />)
    expect(screen.getByText(/Skip ahead without them/i)).toBeInTheDocument()
  })

  it('should not show the skip-ahead link for a solo voter', () => {
    const soloSession = { ...mockSession, users: ['user-1'], voterCount: 1, votersSubmitted: 0 }
    renderWithClient(<WaitingPhase {...defaultProps} session={soloSession} />)
    expect(screen.queryByText(/Skip ahead/i)).not.toBeInTheDocument()
  })

  it('should show confirmation dialog when Skip to next round is clicked', async () => {
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    await user.click(screen.getByText(/Skip ahead without them/i))
    expect(screen.getByText(/Not everyone has voted yet/i)).toBeInTheDocument()
  })

  it('should close confirmation dialog on Cancel', async () => {
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    await user.click(screen.getByText(/Skip ahead without them/i))
    expect(screen.getByText(/Not everyone has voted yet/i)).toBeInTheDocument()

    await user.click(screen.getByText('Cancel'))
    expect(screen.queryByText(/Not everyone has voted yet/i)).not.toBeInTheDocument()
  })

  it('should close confirmation dialog on Escape key', async () => {
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    await user.click(screen.getByText(/Skip ahead without them/i))
    expect(screen.getByText(/Not everyone has voted yet/i)).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByText(/Not everyone has voted yet/i)).not.toBeInTheDocument()
  })

  it('should call closeRound when Confirm is clicked and update session cache', async () => {
    const updatedSession = { ...mockSession, currentRound: 1, votersSubmitted: 0 }
    jest.mocked(api.closeRound).mockResolvedValue(updatedSession)
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    const spy = jest.spyOn(queryClient, 'setQueryData')

    await user.click(screen.getByText(/Skip ahead without them/i))
    await user.click(screen.getByText('Confirm'))

    await waitFor(() => {
      expect(api.closeRound).toHaveBeenCalledWith('test-session', 0)
    })
    expect(spy).toHaveBeenCalledWith(['session', 'test-session'], updatedSession)
    spy.mockRestore()
  })

  it('should display notification checkbox', () => {
    renderWithClient(<WaitingPhase {...defaultProps} />)
    expect(screen.getByText(/Text me when voting opens/i)).toBeInTheDocument()
  })

  it('reveals consent + phone entry when no number is registered', async () => {
    setupSignedIn({ verified: false, phoneLast4: null, consent: false })
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    await user.click(screen.getByText(/Text me when voting opens/i))
    expect(screen.getByPlaceholderText('+1 (555) 123-4567')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /I agree to let Choosee text me about rounds/i })).toBeInTheDocument()
  })

  it('keeps Register disabled until consent is checked and phone is valid', async () => {
    setupSignedIn({ verified: false, phoneLast4: null, consent: false })
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    await user.click(screen.getByText(/Text me when voting opens/i))
    const register = screen.getByRole('button', { name: 'Register' })
    expect(register).toBeDisabled()
    await user.type(screen.getByPlaceholderText('+1 (555) 123-4567'), '5559999999')
    expect(register).toBeDisabled() // valid phone but no consent
    await user.click(screen.getByRole('checkbox', { name: /I agree/i }))
    expect(register).toBeEnabled()
  })

  it('registers the phone then subscribes on submit', async () => {
    setupSignedIn({ verified: false, phoneLast4: null, consent: false })
    jest.mocked(api.registerPhone).mockResolvedValue({ verified: false, phoneLast4: '9999', consent: true })
    jest.mocked(api.subscribeToRound).mockResolvedValue(doneUser)
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    await user.click(screen.getByText(/Text me when voting opens/i))
    await user.type(screen.getByPlaceholderText('+1 (555) 123-4567'), '5559999999')
    await user.click(screen.getByRole('checkbox', { name: /I agree/i }))
    await user.click(screen.getByRole('button', { name: 'Register' }))
    await waitFor(() => expect(api.registerPhone).toHaveBeenCalledWith('+15559999999', true))
    await waitFor(() => expect(api.subscribeToRound).toHaveBeenCalledWith('test-session', 1, 'user-1', true))
    expect(await screen.findByText(/one-tap verification link/i)).toBeInTheDocument()
  })

  it('does not reveal the registration form while the profile is still loading', async () => {
    mockSetAuthState({ isSignedIn: true })
    jest.mocked(useProfile).mockReturnValue({ profile: undefined, isLoading: true, setProfile })
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    await user.click(screen.getByText(/Text me when voting opens/i))
    expect(screen.queryByPlaceholderText('+1 (555) 123-4567')).not.toBeInTheDocument()
    expect(api.subscribeToRound).not.toHaveBeenCalled()
  })

  it('subscribes directly when a verified number is already registered', async () => {
    setupSignedIn({ verified: true, phoneLast4: '4567', consent: true })
    jest.mocked(api.subscribeToRound).mockResolvedValue(doneUser)
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    await user.click(screen.getByText(/Text me when voting opens/i))
    await waitFor(() => expect(api.subscribeToRound).toHaveBeenCalledWith('test-session', 1, 'user-1', true))
    expect(screen.queryByPlaceholderText('+1 (555) 123-4567')).not.toBeInTheDocument()
  })

  it('subscribes then shows the verification hint for an unverified number', async () => {
    setupSignedIn({ verified: false, phoneLast4: '4567', consent: true })
    jest.mocked(api.subscribeToRound).mockResolvedValue(doneUser)
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    await user.click(screen.getByText(/Text me when voting opens/i))
    await waitFor(() => expect(api.subscribeToRound).toHaveBeenCalledWith('test-session', 1, 'user-1', true))
    expect(await screen.findByText(/one-tap verification link/i)).toBeInTheDocument()
    expect(screen.getByText(/●●●●4567/)).toBeInTheDocument()
  })

  it('should display View bracket button', () => {
    renderWithClient(<WaitingPhase {...defaultProps} />)
    expect(screen.getByText(/View bracket/i)).toBeInTheDocument()
  })

  it('should render dialog with aria-modal attribute', async () => {
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    await user.click(screen.getByText(/Skip ahead without them/i))
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toBeInTheDocument()
  })

  it('should uncheck notify when already checked', async () => {
    setupSignedIn({ verified: false, phoneLast4: null, consent: false })
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    // Check it
    await user.click(screen.getByText(/Text me when voting opens/i))
    expect(screen.getByPlaceholderText('+1 (555) 123-4567')).toBeInTheDocument()
    // Uncheck it
    await user.click(screen.getByText(/Text me when voting opens/i))
    expect(screen.queryByPlaceholderText('+1 (555) 123-4567')).not.toBeInTheDocument()
  })

  it('should reset notify on subscribe failure', async () => {
    setupSignedIn({ verified: true, phoneLast4: '4567', consent: true })
    jest.mocked(api.subscribeToRound).mockRejectedValueOnce(new Error('fail'))

    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    await user.click(screen.getByText(/Text me when voting opens/i))

    await waitFor(() => {
      expect(screen.getByText(/Text me when voting opens/i)).toBeInTheDocument()
    })
  })

  it('should open and close bracket view', async () => {
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    await user.click(screen.getByText(/View bracket/i))
    expect(screen.getByTestId('bracket-view')).toBeInTheDocument()
    await user.click(screen.getByText('Close bracket'))
    expect(screen.queryByTestId('bracket-view')).not.toBeInTheDocument()
  })

  it('should not submit empty phone', async () => {
    setupSignedIn({ verified: false, phoneLast4: null, consent: false })
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    await user.click(screen.getByText(/Text me when voting opens/i))
    // Register button should be disabled with empty phone
    const registerBtn = screen.getByText('Register')
    expect(registerBtn).toBeDisabled()
  })

  it('should display voter progress from session payload', () => {
    const session = { ...mockSession, voterCount: 3, votersSubmitted: 1 }
    renderWithClient(<WaitingPhase {...defaultProps} session={session} />)
    expect(screen.getByText(/1/)).toBeInTheDocument()
    expect(screen.getByText(/3/)).toBeInTheDocument()
  })

  it('should handle session with no bracket for current round', () => {
    const sessionNoBracket = { ...mockSession, bracket: [] as [string, string][][] }
    renderWithClient(<WaitingPhase {...defaultProps} session={sessionNoBracket} />)
    expect(screen.getByText(/Voted/i)).toBeInTheDocument()
  })

  it('should show info toast and refresh session on ROUND_NOT_CURRENT close error', async () => {
    jest.mocked(api.hasErrorCode).mockReturnValueOnce(true)
    jest.mocked(api.closeRound).mockRejectedValueOnce(new Error('round conflict'))

    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    const spy = jest.spyOn(queryClient, 'invalidateQueries')

    await user.click(screen.getByText(/Skip ahead without them/i))
    await user.click(screen.getByText('Confirm'))

    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith('Round already advanced.')
    })
    expect(spy).toHaveBeenCalledWith({ queryKey: ['session', 'test-session'] })
    // Confirm dialog should be closed
    expect(screen.queryByText(/Not everyone has voted yet/i)).not.toBeInTheDocument()

    spy.mockRestore()
  })

  it('should show danger toast on generic close error', async () => {
    jest.mocked(api.hasErrorCode).mockReturnValueOnce(false)
    jest.mocked(api.closeRound).mockRejectedValueOnce(new Error('server error'))

    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)

    await user.click(screen.getByText(/Skip ahead without them/i))
    await user.click(screen.getByText('Confirm'))

    await waitFor(() => {
      expect(toast.danger).toHaveBeenCalledWith('Failed to advance round. Please try again.')
    })
  })

  it('should show solo voter hint and "Wrapping up this round" when voterCount <= 1 on first round', () => {
    const soloSession = { ...mockSession, voterCount: 1, votersSubmitted: 1 }
    renderWithClient(<WaitingPhase {...defaultProps} session={soloSession} />)
    expect(screen.getByText(/You're the only one here/i)).toBeInTheDocument()
    expect(screen.getByText(/Wrapping up this round/i)).toBeInTheDocument()
    expect(screen.queryByText(/Waiting for others to finish voting/i)).not.toBeInTheDocument()
  })

  it('should show "Waiting for others" when voterCount > 1', () => {
    renderWithClient(<WaitingPhase {...defaultProps} />)
    expect(screen.getByText(/Waiting for others to finish voting/i)).toBeInTheDocument()
    expect(screen.queryByText(/Wrapping up this round/i)).not.toBeInTheDocument()
  })

  it('should not show solo voter hint after first round', () => {
    const laterSession = { ...mockSession, voterCount: 1, currentRound: 1 }
    renderWithClient(<WaitingPhase {...defaultProps} session={laterSession} />)
    expect(screen.queryByText(/You're the only one here/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Waiting for others to finish voting/i)).toBeInTheDocument()
  })

  describe('when not signed in', () => {
    beforeEach(() => {
      mockSetAuthState({ isSignedIn: false, handleSignIn: jest.fn() })
    })

    it('should show auth gate instead of notify checkbox', () => {
      renderWithClient(<WaitingPhase {...defaultProps} />)
      expect(screen.getByText('Sign in with Google for text reminders')).toBeInTheDocument()
      expect(screen.queryByText(/Text me when voting opens/i)).not.toBeInTheDocument()
    })

    it('should not show phone input', () => {
      renderWithClient(<WaitingPhase {...defaultProps} />)
      expect(screen.queryByPlaceholderText('+1 (555) 123-4567')).not.toBeInTheDocument()
    })
  })
})
