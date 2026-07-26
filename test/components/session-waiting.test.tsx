import { toast } from '@heroui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// @ts-expect-error — mock-only export from __mocks__/index.tsx
import { mockSetAuthState } from '@components/auth-context'
import WaitingPhase from '@components/session/waiting'
import * as api from '@services/api'
import '@testing-library/jest-dom'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChoicesMap, SessionData, User } from '@types'

jest.mock('@components/auth-context')
jest.mock('@services/api')

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
}

const subscribedUser: User = { ...doneUser, subscribedRounds: [1] }

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

const notifyToggleName = /Email me when the next round opens/i

const setupSignedIn = (): void => {
  mockSetAuthState({ isSignedIn: true })
}

const setupSignedOut = (handleSignIn: () => void = jest.fn()): void => {
  mockSetAuthState({ handleSignIn, isSignedIn: false })
}

describe('WaitingPhase', () => {
  beforeAll(() => {
    jest.mocked(api.subscribeToRound).mockResolvedValue(doneUser)
    jest.mocked(api.closeRound).mockResolvedValue(mockSession)
    jest.mocked(api.hasErrorCode).mockReturnValue(false)
    jest.mocked(api.hasStatusCode).mockReturnValue(false)
  })

  it('should display voting progress', () => {
    setupSignedIn()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    expect(screen.getByText(/Voted/i)).toBeInTheDocument()
    expect(screen.getByText(/1/)).toBeInTheDocument()
    expect(screen.getByText(/Waiting for others to finish voting/i)).toBeInTheDocument()
  })

  it('should display voter progress from session payload', () => {
    setupSignedIn()
    const session = { ...mockSession, voterCount: 3, votersSubmitted: 1 }
    renderWithClient(<WaitingPhase {...defaultProps} session={session} />)
    expect(screen.getByText(/1/)).toBeInTheDocument()
    expect(screen.getByText(/3/)).toBeInTheDocument()
  })

  it('should handle session with no bracket for current round', () => {
    setupSignedIn()
    const sessionNoBracket = { ...mockSession, bracket: [] as [string, string][][] }
    renderWithClient(<WaitingPhase {...defaultProps} session={sessionNoBracket} />)
    expect(screen.getByText(/Voted/i)).toBeInTheDocument()
  })

  it('should display the skip-ahead link', () => {
    setupSignedIn()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    expect(screen.getByText(/Skip ahead without them/i)).toBeInTheDocument()
  })

  it('should not show the skip-ahead link for a solo voter', () => {
    setupSignedIn()
    const soloSession = { ...mockSession, users: ['user-1'], voterCount: 1, votersSubmitted: 0 }
    renderWithClient(<WaitingPhase {...defaultProps} session={soloSession} />)
    expect(screen.queryByText(/Skip ahead/i)).not.toBeInTheDocument()
  })

  it('should show the confirmation dialog when the skip-ahead link is clicked', async () => {
    setupSignedIn()
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    await user.click(screen.getByText(/Skip ahead without them/i))
    expect(screen.getByText(/Not everyone has voted/i)).toBeInTheDocument()
  })

  it('should render the confirmation dialog with the alertdialog role', async () => {
    setupSignedIn()
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    await user.click(screen.getByText(/Skip ahead without them/i))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('should render the confirmation dialog inside the backdrop overlay', async () => {
    setupSignedIn()
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    await user.click(screen.getByText(/Skip ahead without them/i))

    // The backdrop is the positioned, full-screen overlay. A dialog rendered outside it lands in
    // its own unpositioned portal at the end of the body — the user sees only the blur.
    expect(screen.getByRole('alertdialog').closest('[data-slot="alert-dialog-backdrop"]')).toBeInTheDocument()
  })

  it('should close confirmation dialog on Cancel', async () => {
    setupSignedIn()
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    await user.click(screen.getByText(/Skip ahead without them/i))
    expect(screen.getByText(/Not everyone has voted/i)).toBeInTheDocument()

    await user.click(screen.getByText('Cancel'))
    expect(screen.queryByText(/Not everyone has voted/i)).not.toBeInTheDocument()
  })

  it('should close confirmation dialog on Escape key', async () => {
    setupSignedIn()
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    await user.click(screen.getByText(/Skip ahead without them/i))
    expect(screen.getByText(/Not everyone has voted/i)).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByText(/Not everyone has voted/i)).not.toBeInTheDocument()
  })

  it('should call closeRound when Skip ahead is confirmed and update session cache', async () => {
    setupSignedIn()
    const updatedSession = { ...mockSession, currentRound: 1, votersSubmitted: 0 }
    jest.mocked(api.closeRound).mockResolvedValueOnce(updatedSession)
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    const spy = jest.spyOn(queryClient, 'setQueryData')

    await user.click(screen.getByText(/Skip ahead without them/i))
    await user.click(screen.getByRole('button', { name: 'Skip ahead' }))

    await waitFor(() => {
      expect(api.closeRound).toHaveBeenCalledWith('test-session', 0)
    })
    expect(spy).toHaveBeenCalledWith(['session', 'test-session'], updatedSession)
    spy.mockRestore()
  })

  it('should show info toast and refresh session on ROUND_NOT_CURRENT close error', async () => {
    setupSignedIn()
    jest.mocked(api.hasErrorCode).mockReturnValueOnce(true)
    jest.mocked(api.closeRound).mockRejectedValueOnce(new Error('round conflict'))

    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    const spy = jest.spyOn(queryClient, 'invalidateQueries')

    await user.click(screen.getByText(/Skip ahead without them/i))
    await user.click(screen.getByRole('button', { name: 'Skip ahead' }))

    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith("That round already ended — here's the current one.")
    })
    expect(spy).toHaveBeenCalledWith({ queryKey: ['session', 'test-session'] })
    expect(screen.queryByText(/Not everyone has voted/i)).not.toBeInTheDocument()

    spy.mockRestore()
  })

  // A 409 must NOT claim the round advanced. It means the write lost a race and was
  // abandoned — and an ordinary vote bumps the session version just by recording
  // votersSubmitted, so the round has very likely not moved. Telling the user it had would
  // strand them believing a skip succeeded when nothing happened.
  it('should say nothing changed, not that the round advanced, on a 409 close conflict', async () => {
    setupSignedIn()
    jest.mocked(api.closeRound).mockRejectedValueOnce(new Error('write conflict'))
    jest.mocked(api.hasStatusCode).mockReturnValueOnce(true)

    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    const spy = jest.spyOn(queryClient, 'invalidateQueries')

    await user.click(screen.getByText(/Skip ahead without them/i))
    await user.click(screen.getByRole('button', { name: 'Skip ahead' }))

    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith('Someone else was updating this Choosee. Nothing changed — try again.')
    })
    expect(spy).toHaveBeenCalledWith({ queryKey: ['session', 'test-session'] })
    expect(toast.danger).not.toHaveBeenCalled()
    // The two paths must stay distinct: this one is retryable, ROUND_NOT_CURRENT is not.
    expect(toast.info).not.toHaveBeenCalledWith("That round already ended — here's the current one.")
    expect(api.hasStatusCode).toHaveBeenCalledWith(expect.anything(), 409)

    spy.mockRestore()
  })

  it('should show danger toast on generic close error', async () => {
    setupSignedIn()
    jest.mocked(api.hasErrorCode).mockReturnValueOnce(false)
    jest.mocked(api.closeRound).mockRejectedValueOnce(new Error('server error'))

    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)

    await user.click(screen.getByText(/Skip ahead without them/i))
    await user.click(screen.getByRole('button', { name: 'Skip ahead' }))

    await waitFor(() => {
      expect(toast.danger).toHaveBeenCalledWith("Couldn't skip ahead. Please try again.")
    })
  })

  it('should display the email reminder toggle when signed in', () => {
    setupSignedIn()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    expect(screen.getByText('Email me when the next round opens')).toBeInTheDocument()
    expect(screen.getByText('One email — nothing else.')).toBeInTheDocument()
  })

  it('should subscribe to the next round when the toggle is tapped', async () => {
    setupSignedIn()
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)

    await user.click(screen.getByRole('switch', { name: notifyToggleName }))

    await waitFor(() => expect(api.subscribeToRound).toHaveBeenCalledWith('test-session', 1, 'user-1'))
  })

  it('should show subscribed copy and lock the toggle once the request resolves', async () => {
    setupSignedIn()
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)

    await user.click(screen.getByRole('switch', { name: notifyToggleName }))

    expect(await screen.findByText("We'll email you!")).toBeInTheDocument()
    expect(screen.getByText('One email when the next round opens.')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /We'll email you!/i })).toBeDisabled()
  })

  // There is no next round after the last one — closing it decides the winner. Promising a
  // round that cannot happen is the kind of copy users notice and stop trusting.
  it('should promise a winner rather than a next round on the last round', () => {
    setupSignedIn()
    const finalRound = { ...mockSession, currentRound: 2, totalRounds: 3 }
    renderWithClient(<WaitingPhase {...defaultProps} session={finalRound} />)

    expect(screen.getByText('Email me when a winner is chosen')).toBeInTheDocument()
    expect(screen.queryByText(/next round/i)).not.toBeInTheDocument()
  })

  it('should promise a winner on the last round in the signed-out gate too', () => {
    setupSignedOut()
    const finalRound = { ...mockSession, currentRound: 2, totalRounds: 3 }
    renderWithClient(<WaitingPhase {...defaultProps} session={finalRound} />)

    expect(screen.getByText('Want an email when a winner is chosen?')).toBeInTheDocument()
  })

  it('should promise a winner on the last round once subscribed', async () => {
    setupSignedIn()
    const finalRound = { ...mockSession, currentRound: 2, totalRounds: 3 }
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} session={finalRound} />)

    await user.click(screen.getByRole('switch', { name: /Email me when a winner is chosen/i }))

    expect(await screen.findByText('One email when a winner is chosen.')).toBeInTheDocument()
  })

  it('should revert the toggle, warn, and re-enable for a retry when subscribing fails', async () => {
    setupSignedIn()
    jest.mocked(api.subscribeToRound).mockRejectedValueOnce(new Error('boom'))
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)

    await user.click(screen.getByRole('switch', { name: notifyToggleName }))

    await waitFor(() => expect(toast.danger).toHaveBeenCalledWith("Couldn't turn on reminders. Please try again."))
    expect(screen.getByText('Email me when the next round opens')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: notifyToggleName })).toBeEnabled()
  })

  // A 403 means the chosen name belongs to another Google account. Retrying cannot succeed,
  // so the copy must differ from the generic failure — this pins that branch, which would
  // otherwise be deletable without failing a single test.
  it('should explain the account mismatch rather than say try again on a 403', async () => {
    setupSignedIn()
    jest.mocked(api.subscribeToRound).mockRejectedValueOnce(new Error('forbidden'))
    jest.mocked(api.hasStatusCode).mockReturnValueOnce(true)
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)

    await user.click(screen.getByRole('switch', { name: notifyToggleName }))

    await waitFor(() =>
      expect(toast.danger).toHaveBeenCalledWith(
        "Someone else claimed this name with their Google account, so we can't email you.",
      ),
    )
    expect(toast.danger).not.toHaveBeenCalledWith("Couldn't turn on reminders. Please try again.")
    // Terminal for this identity: re-arming the toggle would invite a retry that must fail.
    expect(screen.getByRole('switch', { name: notifyToggleName })).toBeDisabled()
  })

  it('should not offer a retry when no verified address is available', async () => {
    setupSignedIn()
    jest.mocked(api.subscribeToRound).mockRejectedValueOnce(new Error('bad request'))
    jest.mocked(api.hasStatusCode).mockReturnValueOnce(false).mockReturnValueOnce(true)
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)

    await user.click(screen.getByRole('switch', { name: notifyToggleName }))

    await waitFor(() =>
      expect(toast.danger).toHaveBeenCalledWith(
        "Your Google account has no verified email address, so we can't send reminders.",
      ),
    )
    expect(screen.getByRole('switch', { name: notifyToggleName })).toBeDisabled()
  })

  it('should keep the toggle disabled while the subscribe request is in flight', async () => {
    setupSignedIn()
    let resolveSubscribe: (value: User) => void = () => undefined
    jest.mocked(api.subscribeToRound).mockReturnValueOnce(
      new Promise<User>((resolve) => {
        resolveSubscribe = resolve
      }),
    )
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)

    const toggle = screen.getByRole('switch', { name: notifyToggleName })
    await user.click(toggle)
    await waitFor(() => expect(toggle).toBeDisabled())

    await user.click(toggle)
    expect(api.subscribeToRound).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveSubscribe(doneUser)
    })
  })

  it('should render as already subscribed when the user is subscribed to the next round', () => {
    setupSignedIn()
    renderWithClient(<WaitingPhase {...defaultProps} currentUser={subscribedUser} />)

    expect(screen.getByText("We'll email you!")).toBeInTheDocument()
    expect(api.subscribeToRound).not.toHaveBeenCalled()
  })

  it('should reset the toggle when the round advances past the subscribed round', () => {
    setupSignedIn()
    // rerender the SAME instance — a second mount would be satisfied by the useState
    // initializers alone, so it would pass even with the round-advance effect deleted.
    const { rerender } = renderWithClient(<WaitingPhase {...defaultProps} currentUser={subscribedUser} />)
    expect(screen.getByText("We'll email you!")).toBeInTheDocument()

    rerender(
      <QueryClientProvider client={queryClient}>
        <WaitingPhase {...defaultProps} currentUser={subscribedUser} session={{ ...mockSession, currentRound: 1 }} />
      </QueryClientProvider>,
    )

    expect(screen.getByText('Email me when the next round opens')).toBeInTheDocument()
    expect(screen.queryByText("We'll email you!")).not.toBeInTheDocument()
  })

  it('should restore the subscribed toggle when a refetch confirms the subscription', () => {
    setupSignedIn()
    const { rerender } = renderWithClient(<WaitingPhase {...defaultProps} currentUser={doneUser} />)
    expect(screen.getByText('Email me when the next round opens')).toBeInTheDocument()

    rerender(
      <QueryClientProvider client={queryClient}>
        <WaitingPhase {...defaultProps} currentUser={subscribedUser} />
      </QueryClientProvider>,
    )

    expect(screen.getByText("We'll email you!")).toBeInTheDocument()
  })

  it('should display View bracket button', () => {
    setupSignedIn()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    expect(screen.getByText(/View bracket/i)).toBeInTheDocument()
  })

  it('should open and close bracket view', async () => {
    setupSignedIn()
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    await user.click(screen.getByText(/View bracket/i))
    expect(screen.getByTestId('bracket-view')).toBeInTheDocument()
    await user.click(screen.getByText('Close bracket'))
    expect(screen.queryByTestId('bracket-view')).not.toBeInTheDocument()
  })

  it('should show solo voter hint and "Wrapping up this round" when voterCount <= 1 on first round', () => {
    setupSignedIn()
    const soloSession = { ...mockSession, voterCount: 1, votersSubmitted: 1 }
    renderWithClient(<WaitingPhase {...defaultProps} session={soloSession} />)
    expect(screen.getByText(/You're the only one here/i)).toBeInTheDocument()
    expect(screen.getByText(/Wrapping up this round/i)).toBeInTheDocument()
    expect(screen.queryByText(/Waiting for others to finish voting/i)).not.toBeInTheDocument()
  })

  it('should show "Waiting for others" when voterCount > 1', () => {
    setupSignedIn()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    expect(screen.getByText(/Waiting for others to finish voting/i)).toBeInTheDocument()
    expect(screen.queryByText(/Wrapping up this round/i)).not.toBeInTheDocument()
  })

  it('should not show solo voter hint after first round', () => {
    setupSignedIn()
    const laterSession = { ...mockSession, voterCount: 1, currentRound: 1 }
    renderWithClient(<WaitingPhase {...defaultProps} session={laterSession} />)
    expect(screen.queryByText(/You're the only one here/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Waiting for others to finish voting/i)).toBeInTheDocument()
  })

  it('should show the auth gate instead of the toggle when signed out', () => {
    setupSignedOut()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    expect(screen.getByText('Want an email when the next round opens?')).toBeInTheDocument()
    expect(screen.queryByText('Email me when the next round opens')).not.toBeInTheDocument()
  })

  it('should trigger sign-in from the auth gate', async () => {
    const handleSignIn = jest.fn()
    setupSignedOut(handleSignIn)
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /Sign in with Google/i }))
    expect(handleSignIn).toHaveBeenCalled()
  })
})
