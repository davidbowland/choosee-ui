import React from 'react'

import WinnerPhase from '@components/session/winner'
import { InstallPromptContext } from '@hooks/useInstallPrompt'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChoicesMap, SessionData } from '@types'
import * as joinedSessions from '@utils/joined-sessions'

const mockPush = jest.fn()
jest.mock('next/router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

jest.mock('@utils/joined-sessions')

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
  currentRound: 1,
  totalRounds: 2,
  bracket: [[['a', 'b']], [['a', 'c']]],
  byes: [null, null],
  isReady: true,
  errorMessage: null,
  filterClosingSoon: false,
  users: ['user-1'],
  winner: 'a',
  type: ['restaurant'],
  exclude: [],
  radius: 5000,
  rankBy: 'DISTANCE',
  voterCount: 2,
  votersSubmitted: 0,
}

const mockChoices: ChoicesMap = {
  a: { choiceId: 'a', name: 'Winner Restaurant', photos: [], rating: 4.5, ratingsTotal: 100 },
  b: { choiceId: 'b', name: 'Restaurant B', photos: [] },
  c: { choiceId: 'c', name: 'Restaurant C', photos: [] },
}

describe('WinnerPhase', () => {
  const mockPromptInstall = jest.fn()
  const installLabel = 'Add Choosee to your Home Screen'

  // jsdom is neither iOS nor Firefox for Android, so a captured prompt is the only thing that makes
  // resolveInstallMethod offer anything here.
  const renderWithCapturedPrompt = (): void => {
    render(
      <InstallPromptContext.Provider value={{ hasInstallPrompt: true, promptInstall: mockPromptInstall }}>
        <WinnerPhase choices={mockChoices} session={mockSession} />
      </InstallPromptContext.Provider>,
    )
  }

  beforeAll(() => {
    mockPromptInstall.mockResolvedValue(undefined)
  })

  it('should display the winning restaurant name', () => {
    render(<WinnerPhase choices={mockChoices} session={mockSession} />)
    expect(screen.getByText('Winner Restaurant')).toBeInTheDocument()
  })

  it('should display Winner title', () => {
    render(<WinnerPhase choices={mockChoices} session={mockSession} />)
    expect(screen.getByText('WINNER')).toBeInTheDocument()
  })

  it('should display Start over button linking to /', async () => {
    const user = userEvent.setup()
    render(<WinnerPhase choices={mockChoices} session={mockSession} />)
    await user.click(screen.getByText(/Start over/i))
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('should open bracket view when View final bracket is clicked', async () => {
    const user = userEvent.setup()
    render(<WinnerPhase choices={mockChoices} session={mockSession} />)
    await user.click(screen.getByText(/View final bracket/i))
    expect(screen.getByTestId('bracket-view')).toBeInTheDocument()
  })

  it('should close bracket view', async () => {
    const user = userEvent.setup()
    render(<WinnerPhase choices={mockChoices} session={mockSession} />)
    await user.click(screen.getByText(/View final bracket/i))
    await user.click(screen.getByText('Close bracket'))
    expect(screen.queryByTestId('bracket-view')).not.toBeInTheDocument()
  })

  it('should render loading spinner when winner choice is not in choices map', () => {
    render(<WinnerPhase choices={{}} session={mockSession} />)
    expect(screen.getByText(/Revealing the winner/i)).toBeInTheDocument()
  })

  it('should render loading when session.winner is null', () => {
    const noWinnerSession = { ...mockSession, winner: null }
    render(<WinnerPhase choices={mockChoices} session={noWinnerSession} />)
    expect(screen.getByText(/Revealing the winner/i)).toBeInTheDocument()
  })

  it('should show filter badge when filterClosingSoon is true', () => {
    render(<WinnerPhase choices={mockChoices} session={{ ...mockSession, filterClosingSoon: true }} />)
    expect(screen.getByText(/Closing soon hidden/i)).toBeInTheDocument()
  })

  it('should not show filter badge when filterClosingSoon is false', () => {
    render(<WinnerPhase choices={mockChoices} session={mockSession} />)
    expect(screen.queryByText(/Closing soon hidden/i)).not.toBeInTheDocument()
  })

  it('should not offer install when the browser cannot install', () => {
    render(<WinnerPhase choices={mockChoices} session={mockSession} />)
    expect(screen.queryByRole('button', { name: installLabel })).not.toBeInTheDocument()
  })

  it('should offer install once the browser has captured a prompt', () => {
    renderWithCapturedPrompt()
    expect(screen.getByRole('button', { name: installLabel })).toBeInTheDocument()
  })

  it('should open the install dialog from the link', async () => {
    const user = userEvent.setup()
    renderWithCapturedPrompt()
    await user.click(screen.getByRole('button', { name: installLabel }))
    expect(screen.getByText('Put Choosee on your Home Screen')).toBeInTheDocument()
  })

  it('should close the install dialog on Not now', async () => {
    const user = userEvent.setup()
    renderWithCapturedPrompt()
    await user.click(screen.getByRole('button', { name: installLabel }))
    await user.click(screen.getByRole('button', { name: 'Not now' }))
    expect(screen.queryByText('Put Choosee on your Home Screen')).not.toBeInTheDocument()
  })

  it('marks the joined-sessions record seen, so the home page retires the card', () => {
    render(<WinnerPhase choices={mockChoices} session={{ ...mockSession, sessionId: 'abcd' }} />)
    expect(joinedSessions.markWinnerSeen).toHaveBeenCalledWith('abcd')
  })

  // fetchChoices and fetchSession resolve independently, so the winner's choice can still be missing
  // when this renders. The effect has to run on that path too, or arriving by push notification
  // while choices are in flight would leave the card on the home page forever.
  it('marks the record seen even while the winning choice is still loading', () => {
    render(<WinnerPhase choices={{}} session={{ ...mockSession, sessionId: 'abcd' }} />)
    expect(joinedSessions.markWinnerSeen).toHaveBeenCalledWith('abcd')
  })
})
