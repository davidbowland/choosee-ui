import { toast } from '@heroui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

import WaitingPhase from '@components/session/waiting'
import * as api from '@services/api'
import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChoicesMap, SessionData, User } from '@types'

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
  votes: [['a']],
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
  beforeAll(() => {
    jest.mocked(api.closeRound).mockResolvedValue(mockSession)
    jest.mocked(api.hasErrorCode).mockReturnValue(false)
    jest.mocked(api.hasStatusCode).mockReturnValue(false)
  })

  it('should display voting progress', () => {
    renderWithClient(<WaitingPhase {...defaultProps} />)
    expect(screen.getByText(/Voted/i)).toBeInTheDocument()
    expect(screen.getByText(/1/)).toBeInTheDocument()
    expect(screen.getByText(/Waiting for others to finish voting/i)).toBeInTheDocument()
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

  it('should display the skip-ahead link', () => {
    renderWithClient(<WaitingPhase {...defaultProps} />)
    expect(screen.getByText(/Skip ahead without them/i)).toBeInTheDocument()
  })

  it('should not show the skip-ahead link for a solo voter', () => {
    const soloSession = { ...mockSession, users: ['user-1'], voterCount: 1, votersSubmitted: 0 }
    renderWithClient(<WaitingPhase {...defaultProps} session={soloSession} />)
    expect(screen.queryByText(/Skip ahead/i)).not.toBeInTheDocument()
  })

  it('should show the confirmation dialog when the skip-ahead link is clicked', async () => {
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    await user.click(screen.getByText(/Skip ahead without them/i))
    expect(screen.getByText(/Not everyone has voted/i)).toBeInTheDocument()
  })

  it('should render the confirmation dialog with the alertdialog role', async () => {
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    await user.click(screen.getByText(/Skip ahead without them/i))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('should render the confirmation dialog inside the backdrop overlay', async () => {
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    await user.click(screen.getByText(/Skip ahead without them/i))

    // The backdrop is the positioned, full-screen overlay. A dialog rendered outside it lands in
    // its own unpositioned portal at the end of the body — the user sees only the blur.
    expect(screen.getByRole('alertdialog').closest('[data-slot="alert-dialog-backdrop"]')).toBeInTheDocument()
  })

  it('should close confirmation dialog on Cancel', async () => {
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    await user.click(screen.getByText(/Skip ahead without them/i))
    expect(screen.getByText(/Not everyone has voted/i)).toBeInTheDocument()

    await user.click(screen.getByText('Cancel'))
    expect(screen.queryByText(/Not everyone has voted/i)).not.toBeInTheDocument()
  })

  it('should close confirmation dialog on Escape key', async () => {
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    await user.click(screen.getByText(/Skip ahead without them/i))
    expect(screen.getByText(/Not everyone has voted/i)).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByText(/Not everyone has voted/i)).not.toBeInTheDocument()
  })

  it('should call closeRound when Skip ahead is confirmed and update session cache', async () => {
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

  it('should display View bracket button', () => {
    renderWithClient(<WaitingPhase {...defaultProps} />)
    expect(screen.getByText(/View bracket/i)).toBeInTheDocument()
  })

  it('should open and close bracket view', async () => {
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    await user.click(screen.getByText(/View bracket/i))
    expect(screen.getByTestId('bracket-view')).toBeInTheDocument()
    await user.click(screen.getByText('Close bracket'))
    expect(screen.queryByTestId('bracket-view')).not.toBeInTheDocument()
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
})
