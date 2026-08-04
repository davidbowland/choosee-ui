import { toast } from '@heroui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

import WaitingPhase from '@components/session/waiting'
import * as api from '@services/api'
import { isSubscribedToPush, subscribeToPush, unsubscribeFromPush } from '@services/push'
import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChoicesMap, SessionData, User } from '@types'
import { CapabilityEnv, readCapabilityEnv } from '@utils/push-capability'

jest.mock('@services/api')
jest.mock('@services/push')

// resolvePushCapability stays real: the point of these tests is that the screen renders whatever
// that function decides, so stubbing it would only assert the component against itself.
jest.mock('@utils/push-capability', () => ({
  ...jest.requireActual('@utils/push-capability'),
  readCapabilityEnv: jest.fn(),
}))

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

// A device that can push and has not been asked yet.
const capableEnv: CapabilityEnv = {
  hasPushManager: true,
  hasServiceWorker: true,
  isIos: false,
  isStandalone: false,
  permission: 'default',
  userAgent: 'Mozilla/5.0 Chrome/120',
}

// The notify control resolves the device asynchronously on mount, so a test that only asserts on
// the synchronous parts of the screen still has to let that land — otherwise the state update
// arrives after the test body has finished and React logs an act() warning for it.
const settleNotifyControl = async (): Promise<void> => {
  await screen.findByRole('switch')
}

describe('WaitingPhase', () => {
  beforeAll(() => {
    jest.mocked(api.closeRound).mockResolvedValue(mockSession)
    jest.mocked(api.hasErrorCode).mockReturnValue(false)
    jest.mocked(api.hasStatusCode).mockReturnValue(false)
    jest.mocked(readCapabilityEnv).mockReturnValue(capableEnv)
    jest.mocked(isSubscribedToPush).mockResolvedValue(false)
    jest.mocked(subscribeToPush).mockResolvedValue('subscribed')
    jest.mocked(unsubscribeFromPush).mockResolvedValue()
  })

  it('should display voting progress', async () => {
    renderWithClient(<WaitingPhase {...defaultProps} />)
    expect(screen.getByText(/Voted/i)).toBeInTheDocument()
    expect(screen.getByText(/1/)).toBeInTheDocument()
    expect(screen.getByText(/Waiting for others to finish voting/i)).toBeInTheDocument()
    await settleNotifyControl()
  })

  it('should display voter progress from session payload', async () => {
    const session = { ...mockSession, voterCount: 3, votersSubmitted: 1 }
    renderWithClient(<WaitingPhase {...defaultProps} session={session} />)
    expect(screen.getByText(/1/)).toBeInTheDocument()
    expect(screen.getByText(/3/)).toBeInTheDocument()
    await settleNotifyControl()
  })

  it('should handle session with no bracket for current round', async () => {
    const sessionNoBracket = { ...mockSession, bracket: [] as [string, string][][] }
    renderWithClient(<WaitingPhase {...defaultProps} session={sessionNoBracket} />)
    expect(screen.getByText(/Voted/i)).toBeInTheDocument()
    await settleNotifyControl()
  })

  it('should display the skip-ahead link', async () => {
    renderWithClient(<WaitingPhase {...defaultProps} />)
    expect(screen.getByText(/Skip ahead without them/i)).toBeInTheDocument()
    await settleNotifyControl()
  })

  it('should not show the skip-ahead link for a solo voter', async () => {
    const soloSession = { ...mockSession, users: ['user-1'], voterCount: 1, votersSubmitted: 0 }
    renderWithClient(<WaitingPhase {...defaultProps} session={soloSession} />)
    expect(screen.queryByText(/Skip ahead/i)).not.toBeInTheDocument()
    await settleNotifyControl()
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

  it('should display View bracket button', async () => {
    renderWithClient(<WaitingPhase {...defaultProps} />)
    expect(screen.getByText(/View bracket/i)).toBeInTheDocument()
    await settleNotifyControl()
  })

  it('should open and close bracket view', async () => {
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} />)
    await user.click(screen.getByText(/View bracket/i))
    expect(screen.getByTestId('bracket-view')).toBeInTheDocument()
    await user.click(screen.getByText('Close bracket'))
    expect(screen.queryByTestId('bracket-view')).not.toBeInTheDocument()
  })

  it('should show solo voter hint and "Wrapping up this round" when voterCount <= 1 on first round', async () => {
    const soloSession = { ...mockSession, voterCount: 1, votersSubmitted: 1 }
    renderWithClient(<WaitingPhase {...defaultProps} session={soloSession} />)
    expect(screen.getByText(/You're the only one here/i)).toBeInTheDocument()
    expect(screen.getByText(/Wrapping up this round/i)).toBeInTheDocument()
    expect(screen.queryByText(/Waiting for others to finish voting/i)).not.toBeInTheDocument()
    await settleNotifyControl()
  })

  it('should show "Waiting for others" when voterCount > 1', async () => {
    renderWithClient(<WaitingPhase {...defaultProps} />)
    expect(screen.getByText(/Waiting for others to finish voting/i)).toBeInTheDocument()
    expect(screen.queryByText(/Wrapping up this round/i)).not.toBeInTheDocument()
    await settleNotifyControl()
  })

  it('should not show solo voter hint after first round', async () => {
    const laterSession = { ...mockSession, voterCount: 1, currentRound: 1 }
    renderWithClient(<WaitingPhase {...defaultProps} session={laterSession} />)
    expect(screen.queryByText(/You're the only one here/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Waiting for others to finish voting/i)).toBeInTheDocument()
    await settleNotifyControl()
  })

  describe('notify control', () => {
    const renderNotify = (env?: Partial<CapabilityEnv>, session: SessionData = mockSession) => {
      jest.mocked(readCapabilityEnv).mockReturnValueOnce({ ...capableEnv, ...env })
      return renderWithClient(<WaitingPhase {...defaultProps} session={session} />)
    }

    it('should offer notifications for the next round', async () => {
      renderNotify()

      expect(await screen.findByText('Notify me when the next round opens')).toBeInTheDocument()
      expect(screen.getByText('One notification — nothing else.')).toBeInTheDocument()
    })

    // The last round has no next round to promise, so the sentence has to change with it.
    it('should promise a winner instead on the final round', async () => {
      renderNotify(undefined, { ...mockSession, currentRound: 2, totalRounds: 3 })

      expect(await screen.findByText('Notify me when a winner is chosen')).toBeInTheDocument()
    })

    it('should never prompt for permission on mount', async () => {
      renderNotify()
      await screen.findByText('Notify me when the next round opens')

      expect(isSubscribedToPush).toHaveBeenCalled()
      expect(subscribeToPush).not.toHaveBeenCalled()
    })

    it('should still offer the control when the subscription read fails', async () => {
      jest.mocked(isSubscribedToPush).mockRejectedValueOnce(new Error('worker exploded'))
      renderNotify()

      expect(await screen.findByText('Notify me when the next round opens')).toBeInTheDocument()
    })

    it('should subscribe when the switch is pressed', async () => {
      const user = userEvent.setup()
      renderNotify()
      await user.click(await screen.findByText('Notify me when the next round opens'))

      await waitFor(() => expect(subscribeToPush).toHaveBeenCalledWith('test-session', 'user-1'))
    })

    it('should confirm once subscribed', async () => {
      const user = userEvent.setup()
      renderNotify()
      await user.click(await screen.findByText('Notify me when the next round opens'))

      expect(await screen.findByText("We'll notify you!")).toBeInTheDocument()
      expect(screen.getByText('One notification when the next round opens.')).toBeInTheDocument()
    })

    it('should say it is working while the subscribe is in flight', async () => {
      let release: (result: 'subscribed') => void = () => undefined
      jest.mocked(subscribeToPush).mockReturnValueOnce(new Promise((resolve) => (release = resolve)))
      const user = userEvent.setup()
      renderNotify()
      await user.click(await screen.findByText('Notify me when the next round opens'))

      expect(await screen.findByText('Turning on notifications…')).toBeInTheDocument()

      release('subscribed')
      expect(await screen.findByText("We'll notify you!")).toBeInTheDocument()
    })

    it('should show the retry line when the worker never became ready', async () => {
      jest.mocked(subscribeToPush).mockResolvedValueOnce('unready')
      const user = userEvent.setup()
      renderNotify()
      await user.click(await screen.findByText('Notify me when the next round opens'))

      expect(await screen.findByText("Couldn't turn on notifications. Please try again.")).toBeInTheDocument()
      // Retryable, so the control stays armed.
      expect(screen.getByRole('switch')).toBeInTheDocument()
    })

    it('should replace the control with an explanation when permission is refused at the prompt', async () => {
      jest.mocked(subscribeToPush).mockResolvedValueOnce('denied')
      const user = userEvent.setup()
      renderNotify()
      await user.click(await screen.findByText('Notify me when the next round opens'))

      expect(await screen.findByText('Notifications are blocked')).toBeInTheDocument()
      expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    })

    it('should replace the control with an explanation when the browser turns out unable', async () => {
      jest.mocked(subscribeToPush).mockResolvedValueOnce('unsupported')
      const user = userEvent.setup()
      renderNotify()
      await user.click(await screen.findByText('Notify me when the next round opens'))

      expect(await screen.findByText("This browser can't send notifications")).toBeInTheDocument()
      expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    })

    it('should explain a blocked permission with no control to press', async () => {
      renderNotify({ permission: 'denied' })

      expect(await screen.findByText('Notifications are blocked')).toBeInTheDocument()
      expect(screen.getByText('Turn them back on in your browser settings.')).toBeInTheDocument()
      expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    })

    it('should name Safari on an unsupported iOS browser', async () => {
      renderNotify({ hasPushManager: false, isIos: true, isStandalone: true, permission: null })

      expect(await screen.findByText("This browser can't send notifications")).toBeInTheDocument()
      expect(screen.getByText('Open Choosee in Safari to turn them on.')).toBeInTheDocument()
    })

    it('should name Chrome on an unsupported non-iOS browser', async () => {
      renderNotify({ hasPushManager: false })

      expect(await screen.findByText('Open Choosee in Chrome to turn them on.')).toBeInTheDocument()
      expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    })

    it('should open the install sheet rather than subscribing on iOS Safari', async () => {
      const user = userEvent.setup()
      renderNotify({ isIos: true, permission: null })
      await user.click(await screen.findByText('Notify me when the next round opens'))

      expect(await screen.findByText('iPhone needs one more step')).toBeInTheDocument()
      expect(screen.getByText('Safari only sends notifications from an app on your Home Screen.')).toBeInTheDocument()
      expect(screen.getByText('2. Tap Add to Home Screen')).toBeInTheDocument()
      expect(subscribeToPush).not.toHaveBeenCalled()
    })

    it('should dismiss the install sheet without installing', async () => {
      const user = userEvent.setup()
      renderNotify({ isIos: true, permission: null })
      await user.click(await screen.findByText('Notify me when the next round opens'))
      await user.click(await screen.findByRole('button', { name: 'Not now' }))

      await waitFor(() => expect(screen.queryByText('iPhone needs one more step')).not.toBeInTheDocument())
    })

    it('should confirm straight away for a device that already holds a subscription', async () => {
      jest.mocked(isSubscribedToPush).mockResolvedValueOnce(true)
      renderNotify()

      expect(await screen.findByText("We'll notify you!")).toBeInTheDocument()
    })

    it('should offer a way to turn notifications back off', async () => {
      jest.mocked(isSubscribedToPush).mockResolvedValueOnce(true)
      const user = userEvent.setup()
      renderNotify()
      await user.click(await screen.findByText('Turn off'))

      await waitFor(() => expect(unsubscribeFromPush).toHaveBeenCalledWith('test-session', 'user-1'))
      expect(await screen.findByText('Notify me when the next round opens')).toBeInTheDocument()
    })

    it('should turn notifications off from the switch as well as the link', async () => {
      jest.mocked(isSubscribedToPush).mockResolvedValueOnce(true)
      const user = userEvent.setup()
      renderNotify()
      await user.click(await screen.findByText("We'll notify you!"))

      await waitFor(() => expect(unsubscribeFromPush).toHaveBeenCalledWith('test-session', 'user-1'))
    })
  })
})
