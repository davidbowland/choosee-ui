import { toast } from '@heroui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

import WaitingPhase from '@components/session/waiting'
import { ConfirmDialog, RosterLine, joinNames } from '@components/session/waiting/elements'
import * as api from '@services/api'
import { isSubscribedToPush, subscribeToPush, unsubscribeFromPush } from '@services/push'
import '@testing-library/jest-dom'
import { render, screen, waitFor, within } from '@testing-library/react'
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
  // Deliberately 1, not 2, and it must stay consistent with whichever users a test renders.
  // votersSubmitted IS the count of users who have answered every matchup this round, so the API
  // cannot produce `votersSubmitted: 1` alongside two users who both hold complete votes. An
  // earlier version of this fixture did exactly that, and the impossible state hid a real bug:
  // round 1 with everyone present done fell through to "Waiting for others to finish voting..."
  // over a full bar. Pair this with `[doneUser, alexStillVoting]`, or raise it when both are done.
  votersSubmitted: 1,
}

// Rounds 2+ keep the behaviour that shipped, so every legacy assertion below runs against a session
// that has left the lobby. Round 0 is the one this feature changes.
const laterRoundSession: SessionData = { ...mockSession, currentRound: 1 }

const doneUser: User = {
  userId: 'user-1',
  name: 'Sam',
  votes: [['a']],
}

const alex: User = {
  userId: 'user-2',
  name: 'Alex',
  votes: [['b']],
}

// votes[0] is empty, so firstUnvotedIndex finds matchup 0 unanswered.
const alexStillVoting: User = {
  userId: 'user-2',
  name: 'Alex',
  votes: [[]],
}

const jordan: User = {
  userId: 'user-3',
  name: 'Jordan',
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
  users: [doneUser, alex],
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
    jest.mocked(api.setExpectedVoters).mockResolvedValue(mockSession)
    jest.mocked(readCapabilityEnv).mockReturnValue(capableEnv)
    jest.mocked(isSubscribedToPush).mockResolvedValue(false)
    jest.mocked(subscribeToPush).mockResolvedValue('subscribed')
    jest.mocked(unsubscribeFromPush).mockResolvedValue()
  })

  it('should display voting progress', async () => {
    renderWithClient(<WaitingPhase {...defaultProps} session={laterRoundSession} />)
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
    renderWithClient(<WaitingPhase {...defaultProps} session={laterRoundSession} />)
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
    renderWithClient(<WaitingPhase {...defaultProps} session={laterRoundSession} />)
    await user.click(screen.getByText(/Skip ahead without them/i))
    expect(screen.getByText(/Not everyone has voted/i)).toBeInTheDocument()
  })

  it('should render the confirmation dialog with the alertdialog role', async () => {
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} session={laterRoundSession} />)
    await user.click(screen.getByText(/Skip ahead without them/i))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('should render the confirmation dialog inside the backdrop overlay', async () => {
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} session={laterRoundSession} />)
    await user.click(screen.getByText(/Skip ahead without them/i))

    // The backdrop is the positioned, full-screen overlay. A dialog rendered outside it lands in
    // its own unpositioned portal at the end of the body — the user sees only the blur.
    expect(screen.getByRole('alertdialog').closest('[data-slot="alert-dialog-backdrop"]')).toBeInTheDocument()
  })

  it('should close confirmation dialog on Cancel', async () => {
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} session={laterRoundSession} />)
    await user.click(screen.getByText(/Skip ahead without them/i))
    expect(screen.getByText(/Not everyone has voted/i)).toBeInTheDocument()

    await user.click(screen.getByText('Cancel'))
    expect(screen.queryByText(/Not everyone has voted/i)).not.toBeInTheDocument()
  })

  it('should close confirmation dialog on Escape key', async () => {
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} session={laterRoundSession} />)
    await user.click(screen.getByText(/Skip ahead without them/i))
    expect(screen.getByText(/Not everyone has voted/i)).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByText(/Not everyone has voted/i)).not.toBeInTheDocument()
  })

  it('should call closeRound when Skip ahead is confirmed and update session cache', async () => {
    const updatedSession = { ...mockSession, currentRound: 2, votersSubmitted: 0 }
    jest.mocked(api.closeRound).mockResolvedValueOnce(updatedSession)
    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} session={laterRoundSession} />)
    const spy = jest.spyOn(queryClient, 'setQueryData')

    await user.click(screen.getByText(/Skip ahead without them/i))
    await user.click(screen.getByRole('button', { name: 'Skip ahead' }))

    await waitFor(() => {
      expect(api.closeRound).toHaveBeenCalledWith('test-session', 1)
    })
    expect(spy).toHaveBeenCalledWith(['session', 'test-session'], updatedSession)
    spy.mockRestore()
  })

  it('should show info toast and refresh session on ROUND_NOT_CURRENT close error', async () => {
    jest.mocked(api.hasErrorCode).mockReturnValueOnce(true)
    jest.mocked(api.closeRound).mockRejectedValueOnce(new Error('round conflict'))

    const user = userEvent.setup()
    renderWithClient(<WaitingPhase {...defaultProps} session={laterRoundSession} />)
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
    renderWithClient(<WaitingPhase {...defaultProps} session={laterRoundSession} />)
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
    renderWithClient(<WaitingPhase {...defaultProps} session={laterRoundSession} />)

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

  // "Voted 1 / 1" is a full bar reporting that nothing happened, at the moment the screen has to say
  // the opposite — so round 1 alone drops the bar entirely and keeps only the invitation.
  it('should show the solo voter hint and no progress bar when voterCount <= 1 on first round', async () => {
    const soloSession = { ...mockSession, voterCount: 1, votersSubmitted: 1 }
    renderWithClient(<WaitingPhase {...defaultProps} session={soloSession} users={[doneUser]} />)
    expect(screen.getByText(/You're the only one here/i)).toBeInTheDocument()
    expect(screen.queryByText('Voted')).not.toBeInTheDocument()
    expect(screen.queryByText(/Waiting for others to finish voting/i)).not.toBeInTheDocument()
    await settleNotifyControl()
  })

  // Once armed, the bar measures against the number that was given, so it comes back even alone.
  it('should show progress against the expected count when armed alone', async () => {
    const soloSession = { ...mockSession, expectedVoters: 3, voterCount: 1, votersSubmitted: 1 }
    renderWithClient(<WaitingPhase {...defaultProps} session={soloSession} users={[doneUser]} />)
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
    expect(screen.getByText('Waiting for 2 more.')).toBeInTheDocument()
    await settleNotifyControl()
  })

  it('should show "Waiting for others" when voterCount > 1', async () => {
    renderWithClient(<WaitingPhase {...defaultProps} session={laterRoundSession} />)
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
    // Rounds 2+ by default: round 1 has its own three copy states, covered in the round-one block.
    const renderNotify = (env?: Partial<CapabilityEnv>, session: SessionData = laterRoundSession) => {
      jest.mocked(readCapabilityEnv).mockReturnValueOnce({ ...capableEnv, ...env })
      return renderWithClient(<WaitingPhase {...defaultProps} session={session} />)
    }

    it('should offer notifications for the next round', async () => {
      renderNotify()

      expect(await screen.findByText('Notify me when the next round opens')).toBeInTheDocument()
      expect(screen.getByText('Each round until a winner, and nothing else.')).toBeInTheDocument()
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
      expect(screen.getByText('Each round, and the winner. Nothing else.')).toBeInTheDocument()
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

    // A dismissed prompt is a "not now", not a refusal. Collapsing it into `denied` told the user

    // notifications were blocked and left them no way back short of a reload.

    // A rejection anywhere inside subscribeToPush used to leave the switch disabled on
    // "Turning on notifications…" forever — no error, no retry, nothing short of a reload.
    it('should offer a retry when the subscribe attempt rejects outright', async () => {
      jest.mocked(subscribeToPush).mockRejectedValueOnce(new Error('vapid key fetch failed'))
      renderNotify()

      await userEvent.click(await screen.findByText('Notify me when the next round opens'))

      expect(await screen.findByText("Couldn't turn on notifications. Please try again.")).toBeInTheDocument()
    })

    // Flipping the UI before the browser let go meant a failed unsubscribe claimed notifications
    // were off while the device was still subscribed.
    it('should not claim notifications are off when unsubscribing fails', async () => {
      jest.mocked(isSubscribedToPush).mockResolvedValueOnce(true)
      jest.mocked(unsubscribeFromPush).mockRejectedValueOnce(new Error('offline'))
      renderNotify()

      await userEvent.click(await screen.findByText('Turn off'))

      // The verb has to match the button that failed.
      expect(await screen.findByText("Couldn't turn off notifications. Please try again.")).toBeInTheDocument()
      expect(screen.queryByText('Notify me when the next round opens')).not.toBeInTheDocument()
    })

    it('should keep the control offered when the permission prompt is dismissed', async () => {
      jest.mocked(subscribeToPush).mockResolvedValueOnce('dismissed')

      renderNotify()

      await userEvent.click(await screen.findByText('Notify me when the next round opens'))

      expect(await screen.findByText('Notify me when the next round opens')).toBeInTheDocument()

      expect(screen.queryByText('Notifications are blocked')).not.toBeInTheDocument()
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

  describe('round one', () => {
    const renderRoundOne = (session: Partial<SessionData> = {}, users: User[] = [doneUser, alex]) =>
      renderWithClient(<WaitingPhase {...defaultProps} session={{ ...mockSession, ...session }} users={users} />)

    it('should ask whether anyone else is coming', async () => {
      renderRoundOne()

      expect(screen.getByText('Anyone else coming?')).toBeInTheDocument()
      await settleNotifyControl()
    })

    // The state this whole feature creates, and the one it got wrong: unarmed round 1 where
    // everyone present HAS voted used to fall through to the rounds-2+ default and print
    // "Waiting for others to finish voting..." beneath a full bar and directly above "Anyone else
    // coming?" — three sentences contradicting each other, the middle one flatly untrue. Nobody
    // present is still voting; that is precisely why the question is being asked.
    it('should not claim it is waiting on anyone once everyone here has voted', async () => {
      renderRoundOne({ votersSubmitted: 2 })

      expect(screen.queryByText(/Waiting for others to finish voting/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/still voting/i)).not.toBeInTheDocument()
      // The roster names Alex inside the card; the progress subtitle deliberately says nothing, so
      // the name appears exactly once rather than stuttering across both.
      expect(screen.getAllByText('Alex')).toHaveLength(1)
      expect(screen.getByText('Anyone else coming?')).toBeInTheDocument()
      await settleNotifyControl()
    })

    // The counts and the names come from different queries on different intervals — the session
    // every 10-15s, the users list every 30s — and they disagree in a direction that loses votes.
    // A newcomer who joins and has not voted lands in votersSubmitted/voterCount up to 30s before
    // the users list knows they exist. Gating the confirm on the names alone meant no confirm, an
    // immediate close, and precisely the silently-discarded vote this feature exists to prevent.
    it('should still confirm when the counts know about someone the roster does not', async () => {
      const user = userEvent.setup()
      // Both known users are done, so outstandingNames is empty — but the session has already seen
      // a third person join who has not voted.
      renderRoundOne({ voterCount: 3, votersSubmitted: 2 }, [doneUser, alex])

      await user.click(screen.getByText('Start round 2'))

      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      expect(api.closeRound).not.toHaveBeenCalled()
    })

    // The roster names other people, never you — "Alex and Jordan are here" cannot be misread as
    // including the reader, and any count can.
    it('should name who else is here', async () => {
      renderRoundOne({ voterCount: 3 }, [doneUser, alex, jordan])

      expect(screen.getByText('Alex and Jordan')).toBeInTheDocument()
      expect(screen.queryByText(/Sam/)).not.toBeInTheDocument()
      await settleNotifyControl()
    })

    it('should name a single other person', async () => {
      renderRoundOne()

      expect(screen.getByText('Alex')).toBeInTheDocument()
      await settleNotifyControl()
    })

    // With nobody else here the roster has no subject, and rendering it anyway produced a
    // subjectless " are here." for the commonest Choosee there is.
    it('should replace the roster with the alone copy when nobody else is here', async () => {
      renderRoundOne({ voterCount: 1, votersSubmitted: 1 }, [doneUser])

      expect(screen.getByText("You've finished round 1.")).toBeInTheDocument()
      expect(screen.queryByText(/are here/)).not.toBeInTheDocument()
      await settleNotifyControl()
    })

    it('should name who is still voting', async () => {
      renderRoundOne({}, [doneUser, alexStillVoting])

      expect(screen.getByText(/Alex is still voting/)).toBeInTheDocument()
      await settleNotifyControl()
    })

    it('should set the expected count from the stepper', async () => {
      const user = userEvent.setup()
      renderRoundOne()

      await user.click(screen.getByText('Wait for others'))
      await user.click(screen.getByLabelText('One more'))
      await user.click(screen.getByText('Done'))

      // Two here plus two more.
      await waitFor(() => expect(api.setExpectedVoters).toHaveBeenCalledWith('test-session', 4))
    })

    it('should tell the stepper what the number buys', async () => {
      const user = userEvent.setup()
      renderRoundOne()

      await user.click(screen.getByText('Wait for others'))

      expect(screen.getByText('Round 2 starts once 1 more person has voted.')).toBeInTheDocument()
    })

    it('should promise the winner from the stepper on a one-round bracket', async () => {
      const user = userEvent.setup()
      renderRoundOne({ totalRounds: 1 })

      await user.click(screen.getByText('Wait for others'))
      await user.click(screen.getByLabelText('One more'))

      expect(screen.getByText('The winner is announced once 2 more people have voted.')).toBeInTheDocument()
    })

    it('should abandon the stepper on Cancel', async () => {
      const user = userEvent.setup()
      renderRoundOne()

      await user.click(screen.getByText('Wait for others'))
      await user.click(screen.getByText('Cancel'))

      expect(screen.getByText('Anyone else coming?')).toBeInTheDocument()
      expect(api.setExpectedVoters).not.toHaveBeenCalled()
    })

    it('should count back down again', async () => {
      const user = userEvent.setup()
      renderRoundOne()

      await user.click(screen.getByText('Wait for others'))
      await user.click(screen.getByLabelText('One more'))
      await user.click(screen.getByLabelText('One more'))
      await user.click(screen.getByLabelText('One fewer'))
      await user.click(screen.getByText('Done'))

      // Two here, plus the two still expected after stepping back from three.
      await waitFor(() => expect(api.setExpectedVoters).toHaveBeenCalledWith('test-session', 4))
    })

    it('should not offer to wait for fewer than one more person', async () => {
      const user = userEvent.setup()
      renderRoundOne()

      await user.click(screen.getByText('Wait for others'))
      await user.click(screen.getByLabelText('One fewer'))
      await user.click(screen.getByText('Done'))

      await waitFor(() => expect(api.setExpectedVoters).toHaveBeenCalledWith('test-session', 3))
    })

    it('should refresh and explain when the round moved under the count', async () => {
      jest.mocked(api.hasStatusCode).mockReturnValueOnce(true)
      jest.mocked(api.setExpectedVoters).mockRejectedValueOnce(new Error('write conflict'))
      const user = userEvent.setup()
      renderRoundOne()
      const spy = jest.spyOn(queryClient, 'invalidateQueries')

      await user.click(screen.getByText('Wait for others'))
      await user.click(screen.getByText('Done'))

      await waitFor(() => expect(toast.info).toHaveBeenCalledWith("That round already ended — here's the current one."))
      expect(spy).toHaveBeenCalledWith({ queryKey: ['session', 'test-session'] })
      spy.mockRestore()
    })

    it('should refresh and explain when the count arrives after the round ended', async () => {
      jest.mocked(api.hasErrorCode).mockReturnValueOnce(true)
      jest.mocked(api.setExpectedVoters).mockRejectedValueOnce(new Error('round not current'))
      const user = userEvent.setup()
      renderRoundOne()

      await user.click(screen.getByText('Wait for others'))
      await user.click(screen.getByText('Done'))

      await waitFor(() => expect(toast.info).toHaveBeenCalledWith("That round already ended — here's the current one."))
    })

    // The server rejects a count above its own ceiling, and the response says so in a way nobody
    // can act on — so the control stops there instead.
    it('should not offer more voters than one Choosee can hold', async () => {
      const user = userEvent.setup()
      renderRoundOne({ voterCount: 19, votersSubmitted: 19 })

      await user.click(screen.getByText('Wait for others'))
      await user.click(screen.getByLabelText('One more'))
      await user.click(screen.getByText('Done'))

      await waitFor(() => expect(api.setExpectedVoters).toHaveBeenCalledWith('test-session', 20))
    })

    // Four errorCode-less 400s share this branch and the client cannot tell them apart, so it must
    // not name a cause. It also must not relay the server's own strings, which say "session" — the
    // one word this product never shows a user. One honest sentence, no retry invitation.
    it('should not invite a retry when the count is refused', async () => {
      jest.mocked(api.hasStatusCode).mockReturnValueOnce(false).mockReturnValueOnce(true)
      jest.mocked(api.setExpectedVoters).mockRejectedValueOnce(new Error('nope'))
      const user = userEvent.setup()
      renderRoundOne()

      await user.click(screen.getByText('Wait for others'))
      await user.click(screen.getByText('Done'))

      await waitFor(() =>
        expect(toast.danger).toHaveBeenCalledWith(
          "Couldn't save that — this Choosee has moved on. Refreshed to catch you up.",
        ),
      )
    })

    it('should not send the count twice on a double tap', async () => {
      let release: (session: SessionData) => void = () => undefined
      jest.mocked(api.setExpectedVoters).mockReturnValueOnce(new Promise((resolve) => (release = resolve)))
      const user = userEvent.setup()
      renderRoundOne()

      await user.click(screen.getByText('Wait for others'))
      await user.click(screen.getByText('Done'))
      await user.click(screen.getByText('Done'))

      expect(api.setExpectedVoters).toHaveBeenCalledTimes(1)

      release(mockSession)
      await waitFor(() => expect(screen.queryByText('How many more?')).not.toBeInTheDocument())
    })

    it('should offer a retry when the count cannot be saved', async () => {
      jest.mocked(api.setExpectedVoters).mockRejectedValueOnce(new Error('server error'))
      const user = userEvent.setup()
      renderRoundOne()

      await user.click(screen.getByText('Wait for others'))
      await user.click(screen.getByText('Done'))

      await waitFor(() => expect(toast.danger).toHaveBeenCalledWith("Couldn't save that. Please try again."))
    })

    it('should start round 2 with no confirmation when everyone here has voted', async () => {
      const user = userEvent.setup()
      renderRoundOne({ votersSubmitted: 2 })

      await user.click(screen.getByText('Start round 2'))

      await waitFor(() => expect(api.closeRound).toHaveBeenCalledWith('test-session', 0))
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })

    // Round 1 never auto-advances without an expected count, so a lone voter with no button here is
    // stuck until the Choosee expires 24 hours later. This is the escape hatch.
    it('should let a solo voter start round 2', async () => {
      const user = userEvent.setup()
      renderRoundOne({ voterCount: 1, votersSubmitted: 1 }, [doneUser])

      await user.click(screen.getByText('Start round 2'))

      await waitFor(() => expect(api.closeRound).toHaveBeenCalledWith('test-session', 0))
    })

    it('should name the person it would cut off before starting round 2', async () => {
      const user = userEvent.setup()
      renderRoundOne({}, [doneUser, alexStillVoting])

      await user.click(screen.getByText('Start round 2'))

      expect(screen.getByText('Start round 2 without Alex?')).toBeInTheDocument()
      expect(
        screen.getByText("Alex hasn't finished voting. Their votes in this round won't count."),
      ).toBeInTheDocument()
      expect(api.closeRound).not.toHaveBeenCalled()
    })

    it('should close the round once the named confirm is accepted', async () => {
      const user = userEvent.setup()
      renderRoundOne({}, [doneUser, alexStillVoting])

      await user.click(screen.getByText('Start round 2'))
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Start round 2' }))

      await waitFor(() => expect(api.closeRound).toHaveBeenCalledWith('test-session', 0))
    })

    it('should offer the winner instead of a round when round 1 is the last one', async () => {
      renderRoundOne({ totalRounds: 1 })

      expect(screen.getByText('See the winner')).toBeInTheDocument()
      expect(screen.queryByText('Start round 2')).not.toBeInTheDocument()
      await settleNotifyControl()
    })

    // A one-round bracket crowns a winner rather than opening round 2, so a confirm reading
    // "Start round 2 without Alex?" would be a lie about what the button does.
    it('should promise the winner in the confirm on a one-round bracket', async () => {
      const user = userEvent.setup()
      renderRoundOne({ totalRounds: 1 }, [doneUser, alexStillVoting])

      await user.click(screen.getByText('See the winner'))

      expect(screen.getByText('See the winner without Alex?')).toBeInTheDocument()
      expect(
        within(screen.getByRole('alertdialog')).getByRole('button', { name: 'See the winner' }),
      ).toBeInTheDocument()
      expect(screen.queryByText(/Start round 2/)).not.toBeInTheDocument()
    })

    it('should name everyone it would cut off', async () => {
      const user = userEvent.setup()
      const jordanStillVoting: User = { userId: 'user-3', name: 'Jordan', votes: [[]] }
      renderRoundOne({ voterCount: 3 }, [doneUser, alexStillVoting, jordanStillVoting])

      await user.click(screen.getByText('Start round 2'))

      expect(screen.getByText('Start round 2 without Alex and Jordan?')).toBeInTheDocument()
      expect(
        screen.getByText("Alex and Jordan haven't finished voting. Their votes in this round won't count."),
      ).toBeInTheDocument()
    })

    it('should show progress against the expected count once armed', async () => {
      renderRoundOne({ expectedVoters: 4, votersSubmitted: 2 })

      expect(screen.getByText('2 / 4')).toBeInTheDocument()
      expect(screen.getByText('Alex is here. Waiting for 2 more.')).toBeInTheDocument()
      expect(screen.getByText('Change how many')).toBeInTheDocument()
      expect(screen.queryByText('Anyone else coming?')).not.toBeInTheDocument()
      await settleNotifyControl()
    })

    it('should stop counting down once the expected number have turned up', async () => {
      renderRoundOne({ expectedVoters: 2, votersSubmitted: 1 })

      expect(screen.getByText('Alex is here.')).toBeInTheDocument()
      await settleNotifyControl()
    })

    it('should name everyone still here in the armed subtitle', async () => {
      renderRoundOne({ expectedVoters: 4, voterCount: 3, votersSubmitted: 2 }, [doneUser, alex, jordan])

      expect(screen.getByText('Alex and Jordan are here. Waiting for 1 more.')).toBeInTheDocument()
      await settleNotifyControl()
    })

    it('should let an armed round be started early', async () => {
      const user = userEvent.setup()
      renderRoundOne({ expectedVoters: 4, votersSubmitted: 2 })

      await user.click(screen.getByText('Start round 2 now'))

      await waitFor(() => expect(api.closeRound).toHaveBeenCalledWith('test-session', 0))
    })

    it('should reopen the stepper from the armed state', async () => {
      const user = userEvent.setup()
      renderRoundOne({ expectedVoters: 4, votersSubmitted: 2 })

      await user.click(screen.getByText('Change how many'))

      expect(screen.getByText('How many more?')).toBeInTheDocument()
    })

    // The switch is what makes leaving safe, and being alone is when that matters most.
    it('should still offer notifications when nobody else is here', async () => {
      renderRoundOne({ voterCount: 1, votersSubmitted: 1 }, [doneUser])

      expect(await screen.findByText('Notify me when someone else votes')).toBeInTheDocument()
    })

    it('should promise a heads-up once everyone here has voted', async () => {
      renderRoundOne()

      expect(await screen.findByText("Notify me when everyone's voted")).toBeInTheDocument()
    })

    it('should leave rounds after the first untouched', async () => {
      renderRoundOne({ currentRound: 1 })

      expect(screen.getByText('Skip ahead without them')).toBeInTheDocument()
      expect(screen.getByText(/Waiting for others to finish voting/)).toBeInTheDocument()
      expect(screen.queryByText('Anyone else coming?')).not.toBeInTheDocument()
      expect(screen.queryByText('Start round 3')).not.toBeInTheDocument()
      await settleNotifyControl()
    })

    // The count is round-1 state. A later round reading it would report progress against a number
    // the server stopped consulting.
    it('should ignore a leftover expected count after round 1', async () => {
      renderRoundOne({ currentRound: 1, expectedVoters: 4, votersSubmitted: 1 })

      expect(screen.getByText('1 / 2')).toBeInTheDocument()
      expect(screen.getByText(/Waiting for others to finish voting/)).toBeInTheDocument()
      await settleNotifyControl()
    })

    it('should keep the rounds-2+ confirm unnamed', async () => {
      const user = userEvent.setup()
      // A round-1 matchup nobody has answered, so Alex really is outstanding — the names are
      // withheld here by choice, not for want of anyone to name.
      renderRoundOne({ bracket: [[['a', 'b']], [['a', 'c']]], currentRound: 1 }, [doneUser, alexStillVoting])

      await user.click(screen.getByText('Skip ahead without them'))

      expect(screen.getByText('Skip ahead without them?')).toBeInTheDocument()
      expect(screen.getByText("Not everyone has voted. Their votes won't count in this round.")).toBeInTheDocument()
      expect(screen.queryByText(/without Alex/)).not.toBeInTheDocument()
    })
  })
})

// One join for every surface that lists people. A second implementation is how "Sam, Alex and
// Jordan" drifts into "Sam, Alex, and Jordan" on one screen and not the other.
describe('joinNames', () => {
  it('should render nobody as nothing', () => {
    expect(joinNames([])).toEqual('')
  })

  it('should render one name on its own', () => {
    expect(joinNames(['Sam'])).toEqual('Sam')
  })

  it('should join two names with and', () => {
    expect(joinNames(['Sam', 'Alex'])).toEqual('Sam and Alex')
  })

  it('should comma-separate all but the last', () => {
    expect(joinNames(['Sam', 'Alex', 'Jordan'])).toEqual('Sam, Alex and Jordan')
  })
})

describe('ConfirmDialog', () => {
  // The shared default keeps a caller that has no action label rendering the copy that shipped,
  // rather than a heading with a hole in it.
  it('should fall back to starting round 2 when the caller names no action', () => {
    render(
      <ConfirmDialog
        isLoading={false}
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
        open={true}
        outstandingNames={['Alex']}
      />,
    )

    expect(screen.getByText('Start round 2 without Alex?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start round 2' })).toBeInTheDocument()
  })
})

describe('RosterLine', () => {
  // The roster names other people, so an empty list is the solo voter — the one case that must
  // never render, because "" + " are here." is a sentence with no subject.
  it('should render nothing when there is nobody to name', () => {
    const { container } = render(<RosterLine names={[]} />)

    expect(container).toBeEmptyDOMElement()
  })
})
