import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

import ActiveSessions from '@components/active-sessions'
import * as api from '@services/api'
import '@testing-library/jest-dom'
import { RenderResult, render, screen, waitFor } from '@testing-library/react'
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
const marcus: User = { name: 'Marcus', userId: 'user-2', votes: [['a'], ['a']] }
const anon: User = { name: null, userId: 'user-3', votes: [['a'], ['a']] }

const HOUR_MS = 60 * 60 * 1000
const MINUTE_MS = 60 * 1000

/** Two hours after the entry was joined. Fixed for the file, so every age on screen is a constant. */
const now = entry.joinedAt + 2 * HOUR_MS

/** Joined 23h20m before `now`, leaving 40 minutes of its 24-hour life. */
const nearlyExpired = { ...entry, joinedAt: now - 23 * HOUR_MS - 20 * MINUTE_MS }
const choices: ChoicesMap = { 'choice-1': { choiceId: 'choice-1', name: 'Gates Bar-B-Q', photos: [] } }

const renderComponent = (): RenderResult => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ActiveSessions />
    </QueryClientProvider>,
  )
}

describe('ActiveSessions', () => {
  afterAll(() => {
    jest.useRealTimers()
  })

  beforeAll(() => {
    // The card reports how long ago a Choosee was joined, and it reads the clock itself rather than
    // taking it as a prop. Only Date is faked: react-query and userEvent both need real timers, and
    // faking those instead of this would hang every await in the file.
    jest.useFakeTimers({
      doNotFake: [
        'cancelAnimationFrame',
        'cancelIdleCallback',
        'clearImmediate',
        'clearInterval',
        'clearTimeout',
        'hrtime',
        'nextTick',
        'performance',
        'queueMicrotask',
        'requestAnimationFrame',
        'requestIdleCallback',
        'setImmediate',
        'setInterval',
        'setTimeout',
      ],
    })
    jest.setSystemTime(now)

    mockedStore.readJoinedSessions.mockReturnValue([entry])
    mockedApi.fetchSession.mockResolvedValue(session)
    mockedApi.fetchUsers.mockResolvedValue([unvoted])
    mockedApi.fetchChoices.mockResolvedValue(choices)
    // The 404 signal is keyed off the rejection a test supplies rather than a per-test
    // mockReturnValue: clearMocks clears calls, not implementations, so an override set inside one
    // test would still be in force for every test after it.
    mockedApi.hasStatusCode.mockImplementation((err) => (err as Error | undefined)?.message === 'gone')
  })

  // A first-time visitor must get the home page exactly as it was before this feature existed —
  // no heading, no empty container, no reserved gap above the create form. Querying only for the
  // heading would pass on an empty <section> that still occupies layout.
  it('renders nothing at all when no Choosees are remembered', () => {
    mockedStore.readJoinedSessions.mockReturnValueOnce([])

    const { container } = renderComponent()

    expect(container).toBeEmptyDOMElement()
  })

  it('shows the address before the network answers', async () => {
    renderComponent()

    expect(screen.getByText(/4102 Main St/)).toBeInTheDocument()
    await screen.findByText(/Your turn/i)
  })

  // Time first, address last. Whatever runs off the end of this line on a narrow phone is the least
  // useful thing on the card, which is the whole reason the address was moved onto it.
  it('says how long ago the Choosee was joined, ahead of the address', async () => {
    renderComponent()

    expect(screen.getByText('2h ago · 4102 Main St')).toBeInTheDocument()
    await screen.findByText(/Your turn/i)
  })

  // The one place in the app that admits a Choosee expires. Nothing else tells anyone.
  it('counts down instead once the Choosee is nearly expired', async () => {
    mockedStore.readJoinedSessions.mockReturnValueOnce([nearlyExpired])

    renderComponent()

    expect(screen.getByText('40 min left · 4102 Main St')).toBeInTheDocument()
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

    expect(await screen.findByText('Your turn to vote')).toBeInTheDocument()
    expect(screen.getByText('Round 2 of 3')).toBeInTheDocument()
  })

  it('counts who is left when waiting on other people', async () => {
    mockedApi.fetchUsers.mockResolvedValueOnce([voted])

    renderComponent()

    expect(await screen.findByText('Waiting on 2 others')).toBeInTheDocument()
  })

  // The count comes from the session and the name from the voter list. Naming somebody is only worth
  // doing when both agree there is exactly one person holding the round up.
  it('names the one person the round is waiting on', async () => {
    mockedApi.fetchSession.mockResolvedValueOnce({ ...session, voterCount: 2, votersSubmitted: 1 })
    mockedApi.fetchUsers.mockResolvedValueOnce([voted, { ...marcus, votes: [['a'], []] }])

    renderComponent()

    expect(await screen.findByText('Waiting on Marcus')).toBeInTheDocument()
  })

  // The line that actually tells two Choosees apart. Everything else about them is usually identical
  // — same address, same round — because people start them from the same kitchen.
  it('names who you are deciding with, alongside the round', async () => {
    mockedApi.fetchUsers.mockResolvedValueOnce([unvoted, marcus])

    renderComponent()

    expect(await screen.findByText('Marcus · round 2 of 3')).toBeInTheDocument()
  })

  it('leaves out anyone who has not named themselves', async () => {
    mockedApi.fetchUsers.mockResolvedValueOnce([unvoted, marcus, anon])

    renderComponent()

    expect(await screen.findByText('Marcus · round 2 of 3')).toBeInTheDocument()
  })

  // Storage is what paints first, so a roster that only ever came from the network would pop in a
  // beat late on every visit — the same reason the round is cached.
  it('shows the stored roster before the voter list answers', () => {
    mockedStore.readJoinedSessions.mockReturnValueOnce([{ ...entry, names: ['Marcus', 'Priya'] }])

    renderComponent()

    expect(screen.getByText('Marcus & Priya')).toBeInTheDocument()
  })

  it('stores the roster so the next first paint has it', async () => {
    mockedApi.fetchUsers.mockResolvedValueOnce([unvoted, marcus])

    renderComponent()

    await waitFor(() =>
      expect(mockedStore.rememberSession).toHaveBeenCalledWith(expect.objectContaining({ names: ['Marcus'] })),
    )
  })

  // rememberSession merges over the previous record, so writing an explicit undefined would erase a
  // roster this device already knew and put the next first paint back where it started.
  it('does not erase a stored roster when the voter list has not arrived', async () => {
    mockedStore.readJoinedSessions.mockReturnValueOnce([{ ...entry, names: ['Marcus'] }])
    mockedApi.fetchUsers.mockRejectedValueOnce(new Error('offline'))

    renderComponent()

    await waitFor(() => expect(mockedStore.rememberSession).toHaveBeenCalled())
    expect(mockedStore.rememberSession).not.toHaveBeenCalledWith(expect.objectContaining({ names: undefined }))
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
    expect(screen.queryByText(/4102 Main St/)).not.toBeInTheDocument()
  })

  it('keeps the card when the request fails for any other reason', async () => {
    mockedApi.fetchSession.mockRejectedValueOnce(new Error('offline'))

    renderComponent()

    await waitFor(() => expect(mockedApi.hasStatusCode).toHaveBeenCalledWith(expect.any(Error), 404))
    expect(screen.getByText(/4102 Main St/)).toBeInTheDocument()
    expect(mockedStore.forgetSession).not.toHaveBeenCalled()
  })

  it('removes a dismissed card and records the dismissal', async () => {
    renderComponent()
    await screen.findByText(/Your turn/i)

    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }))

    expect(mockedStore.dismissSession).toHaveBeenCalledWith('abcd')
    expect(screen.queryByText(/4102 Main St/)).not.toBeInTheDocument()
  })

  it('links each card to its Choosee', async () => {
    renderComponent()

    expect(await screen.findByRole('link', { name: /4102 Main St/i })).toHaveAttribute('href', '/s/abcd')
  })

  // The record is otherwise only ever written at join time, so the round it caches would be frozen
  // at whatever it was then. Someone who joined at round 0 and came back three rounds later would
  // be shown "Round 1 of 5" on first paint before it snapped to the truth.
  it('refreshes the stored round so the next first paint is not stale', async () => {
    mockedApi.fetchSession.mockResolvedValueOnce({ ...session, address: 'Moved St', currentRound: 2 })

    renderComponent()

    await waitFor(() =>
      expect(mockedStore.rememberSession).toHaveBeenCalledWith({
        address: 'Moved St',
        currentRound: 2,
        sessionId: 'abcd',
        totalRounds: 3,
        userId: 'user-1',
      }),
    )
  })

  it('does not write anything back before the session arrives', () => {
    renderComponent()

    expect(mockedStore.rememberSession).not.toHaveBeenCalled()
  })

  // Not written back either, for the same reason the users query is gated: a not-ready session has
  // an empty bracket, so caching its zeros would paint "Round 1 of 0" on the next first load. The
  // test above passes with or without the guard, because address is undefined at that point anyway.
  it('does not write anything back for a session that is not ready', async () => {
    mockedApi.fetchSession.mockResolvedValueOnce({ ...session, isReady: false })

    renderComponent()

    await waitFor(() => expect(mockedApi.fetchSession).toHaveBeenCalled())
    expect(mockedStore.rememberSession).not.toHaveBeenCalled()
  })

  // Pins the single most consequential line in the module. forgetSession is the only genuine delete
  // — everything else flags — and retry is off globally, so keying it on this secondary endpoint
  // would let one 404 during a deploy window strip the identity from every card on every device with
  // this page open. Those people would then meet the name picker and vote as a second person. The
  // decision was otherwise protected by a comment and nothing else.
  it('keeps the card when only the voter list 404s', async () => {
    mockedApi.fetchUsers.mockRejectedValueOnce(new Error('gone'))

    renderComponent()

    await waitFor(() => expect(mockedApi.fetchUsers).toHaveBeenCalled())
    expect(mockedStore.forgetSession).not.toHaveBeenCalled()
    expect(screen.getByText(/4102 Main St/)).toBeInTheDocument()
  })
})
