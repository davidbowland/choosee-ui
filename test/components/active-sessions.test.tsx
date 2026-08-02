import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query'
import React from 'react'

import ActiveSessions from '@components/active-sessions'
import * as api from '@services/api'
import '@testing-library/jest-dom'
import { RenderResult, act, render, screen, waitFor } from '@testing-library/react'
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

// The component no longer owns the list, so leaving is something it reports rather than something it
// does. Stable module-level references: the card's 404 effect takes onGone as a dependency, and a
// fresh function per render would re-fire it.
const onDismiss = jest.fn()
const onGone = jest.fn()

// The give-up timer is injected rather than faked, because this file cannot fake setTimeout (see the
// beforeAll below). NEVER is far longer than any test here runs, so a test that passes it is proving
// something about query status alone; PROMPTLY is short enough that a test which genuinely needs the
// timer does not sit waiting for it. Real timers either way, so nothing depends on ordering.
const NEVER = 60_000
const PROMPTLY = 50

/** A request that neither resolves nor rejects — a captive portal, a dead network. */
const noAnswer = <T,>(): Promise<T> => new Promise<T>(() => undefined)

/**
 * A request that answers exactly when the test says so, and not before.
 *
 * The only way to write "this arrived after the list was painted" without a sleep: the give-up timer
 * paints, and then the test hands the card its answer.
 */
const deferred = <T,>(): { promise: Promise<T>; resolve: (value: T) => void } => {
  let settle: (value: T) => void = () => undefined
  const promise = new Promise<T>((resolve) => {
    settle = resolve
  })
  return { promise, resolve: (value: T) => settle(value) }
}

/** Where the cards point, in the order they are on screen. One link per card, so this is the order. */
const cardTargets = (): (string | null)[] => screen.getAllByRole('link').map((link) => link.getAttribute('href'))

const renderComponent = (
  entries: joinedSessions.JoinedSession[] = [entry],
  { settleTimeoutMs }: { settleTimeoutMs?: number } = {},
): RenderResult => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ActiveSessions entries={entries} onDismiss={onDismiss} onGone={onGone} settleTimeoutMs={settleTimeoutMs} />
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
    const { container } = renderComponent([])

    expect(container).toBeEmptyDOMElement()
  })

  // The address is stored, so it owes the network nothing. Since the paint gate it can no longer be
  // read off the first frame — that frame is a skeleton — so the request is made never to answer and
  // the give-up timer lets the card through. Stronger on source of truth, weaker on timing: it pins
  // that the address comes from the record, not that it arrives early. Nothing pins the timing any
  // more, because this feature deliberately removed it.
  it('shows the address when the network never answers', async () => {
    mockedApi.fetchSession.mockReturnValueOnce(noAnswer<SessionData>())

    renderComponent([entry], { settleTimeoutMs: PROMPTLY })

    expect(await screen.findByText(/4102 Main St/)).toBeInTheDocument()
  })

  // Time first, address last. Whatever runs off the end of this line on a narrow phone is the least
  // useful thing on the card, which is the whole reason the address was moved onto it.
  it('says how long ago the Choosee was joined, ahead of the address', async () => {
    renderComponent()

    expect(await screen.findByText('2h ago · 4102 Main St')).toBeInTheDocument()
  })

  // The one place in the app that admits a Choosee expires. Nothing else tells anyone.
  it('counts down instead once the Choosee is nearly expired', async () => {
    renderComponent([nearlyExpired])

    expect(await screen.findByText('40 min left · 4102 Main St')).toBeInTheDocument()
  })

  // The round is local data, so a card can report it whatever the network does. It is no longer
  // shown *before* the request — the paint gate holds the whole list until every card settles — but
  // on a connection that never answers it is the difference between a useful card and a pulsing bar,
  // which is what this pins.
  it('shows the cached round when the network never answers', async () => {
    mockedApi.fetchSession.mockReturnValueOnce(noAnswer<SessionData>())

    renderComponent([entry], { settleTimeoutMs: PROMPTLY })

    expect(await screen.findByText(/Round 2 of 3/i)).toBeInTheDocument()
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

  // The stored roster is what the card falls back to, and it has to be enough on its own: the
  // default fetchUsers mock returns this device's own voter and nobody else, so a roster read from
  // the network would come back empty. Same reason the round is cached.
  it('shows the stored roster when the voter list never answers', async () => {
    mockedApi.fetchUsers.mockReturnValueOnce(noAnswer<User[]>())

    renderComponent([{ ...entry, names: ['Marcus', 'Priya'] }], { settleTimeoutMs: PROMPTLY })

    expect(await screen.findByText('Marcus & Priya')).toBeInTheDocument()
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
    mockedApi.fetchUsers.mockRejectedValueOnce(new Error('offline'))

    renderComponent([{ ...entry, names: ['Marcus'] }])

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

  // Reporting, not removing. The entry leaves the list in useJoinedSessions, which owns it; what is
  // pinned here is that the card names the right Choosee and only ever reports a genuine expiry.
  it('reports a Choosee the server no longer has', async () => {
    mockedApi.fetchSession.mockRejectedValueOnce(new Error('gone'))

    renderComponent()

    await waitFor(() => expect(onGone).toHaveBeenCalledWith('abcd'))
  })

  it('keeps the card when the request fails for any other reason', async () => {
    mockedApi.fetchSession.mockRejectedValueOnce(new Error('offline'))

    renderComponent()

    // Waiting on the card rather than on the hasStatusCode call: a failed query settles, so the card
    // appearing at all is also the proof that a failure does not leave it shimmering.
    expect(await screen.findByText(/4102 Main St/)).toBeInTheDocument()
    expect(mockedApi.hasStatusCode).toHaveBeenCalledWith(expect.any(Error), 404)
    expect(onGone).not.toHaveBeenCalled()
  })

  it('reports a dismissal against the card that was dismissed', async () => {
    renderComponent()
    await screen.findByText(/Your turn/i)

    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }))

    expect(onDismiss).toHaveBeenCalledWith('abcd')
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

  // Pins the single most consequential line in the module. onGone is the only genuine delete —
  // everything else flags — and retry is off globally, so keying it on this secondary endpoint would
  // let one 404 during a deploy window strip the identity from every card on every device with this
  // page open. Those people would then meet the name picker and vote as a second person. The
  // decision was otherwise protected by a comment and nothing else.
  it('keeps the card when only the voter list 404s', async () => {
    mockedApi.fetchUsers.mockRejectedValueOnce(new Error('gone'))

    renderComponent()

    expect(await screen.findByText(/4102 Main St/)).toBeInTheDocument()
    expect(mockedApi.fetchUsers).toHaveBeenCalled()
    expect(onGone).not.toHaveBeenCalled()
  })

  // The list will be ordered by what each card turns out to be, so it cannot draw cards it cannot yet
  // order — a card that changed from "Round 2 of 3" to "Thai Kitchen won" under a thumb already
  // moving toward it would be a different card, not a more detailed one.
  describe('paint gate', () => {
    // Two entries, not one: with a single card "one skeleton per entry" is indistinguishable from a
    // hard-coded single skeleton. The absent button matters as much as the absent link — the whole
    // point of the placeholder is that nothing on it can be tapped, and dismissal is permanent.
    it('shows one skeleton per entry and nothing tappable while a card is unsettled', async () => {
      // Once per card, never mockReturnValue: clearMocks calls mockClear, which forgets the calls
      // but keeps the implementation, so a permanent stub here would follow every later test in the
      // file and none of their cards would ever settle.
      mockedApi.fetchSession.mockReturnValueOnce(noAnswer<SessionData>()).mockReturnValueOnce(noAnswer<SessionData>())

      const { container } = renderComponent([entry, { ...entry, sessionId: 'efgh' }], { settleTimeoutMs: NEVER })

      await waitFor(() => expect(container.querySelectorAll('[data-loading="card"]')).toHaveLength(2))
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
      expect(screen.queryByText(/Your turn to vote/)).not.toBeInTheDocument()
    })

    it('paints the card once every query has settled', async () => {
      mockedApi.fetchUsers.mockResolvedValueOnce([unvoted, marcus])

      const { container } = renderComponent([entry], { settleTimeoutMs: NEVER })

      expect(await screen.findByText('Your turn to vote')).toBeInTheDocument()
      expect(container.querySelectorAll('[data-loading="card"]')).toHaveLength(0)
    })

    // Retry is off globally, so a failure is final the moment it lands. Keying the gate on having
    // data instead of on not being pending would leave this card shimmering for as long as the page
    // stayed open, which is the worst outcome available on the connection most likely to produce it.
    it('paints a card whose request failed rather than shimmering forever', async () => {
      mockedApi.fetchSession.mockRejectedValueOnce(new Error('offline'))

      const { container } = renderComponent([entry], { settleTimeoutMs: NEVER })

      expect(await screen.findByText('Round 2 of 3')).toBeInTheDocument()
      expect(container.querySelectorAll('[data-loading="card"]')).toHaveLength(0)
    })

    // The only thing that can retire this skeleton is the give-up timer, so this passes only if that
    // timer genuinely fires.
    it('gives up waiting on a request that never answers and paints what it has', async () => {
      mockedApi.fetchSession.mockReturnValueOnce(noAnswer<SessionData>())

      const { container } = renderComponent([entry], { settleTimeoutMs: PROMPTLY })

      await waitFor(() => expect(container.querySelectorAll('[data-loading="card"]')).toHaveLength(0))
      expect(screen.getByText('Round 2 of 3')).toBeInTheDocument()
    })

    // The gate waits on every entry, including the ones the cap is hiding, because their kinds are
    // what decide which entries the cap keeps. That only works because a hidden card still mounts
    // and still runs its queries; an entry that rendered nothing at all would report nothing, and
    // this would sit at four skeletons until the timer fired. NEVER is what proves the timer is not
    // the thing rescuing it.
    it('does not deadlock when the cap is hiding an entry the gate is waiting on', async () => {
      const four = ['a', 'b', 'c', 'd'].map((sessionId) => ({ ...entry, sessionId }))

      const { container } = renderComponent(four, { settleTimeoutMs: NEVER })

      await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(3))
      expect(container.querySelectorAll('[data-loading="card"]')).toHaveLength(0)
    })

    // One skeleton per visible slot, not one per remembered Choosee. Someone with twelve records
    // would otherwise meet twelve placeholders and then three cards, which is a bigger jump than the
    // one the placeholders exist to prevent.
    it('stands in for the cards the cap will show, not for the whole record', async () => {
      const four = ['a', 'b', 'c', 'd'].map((sessionId) => ({ ...entry, sessionId }))
      mockedApi.fetchSession
        .mockReturnValueOnce(noAnswer<SessionData>())
        .mockReturnValueOnce(noAnswer<SessionData>())
        .mockReturnValueOnce(noAnswer<SessionData>())
        .mockReturnValueOnce(noAnswer<SessionData>())

      const { container } = renderComponent(four, { settleTimeoutMs: NEVER })

      await waitFor(() => expect(container.querySelectorAll('[data-loading="card"]')).toHaveLength(3))
      // Nor the control that lifts the cap: it would be counting cards nobody can see yet, and it
      // would be the one tappable thing on a list that is deliberately untappable until it is final.
      expect(screen.queryByRole('button', { name: /^Show/ })).not.toBeInTheDocument()
    })
  })

  // The cap is only honest if the three it keeps are the three that matter. Ordering by age alone
  // could cut the Choosee whose winner just landed to make room for two nobody is waiting on.
  // Amber means the card wants you. A winner is only ever one you have not opened — markWinnerSeen
  // fires on the winner screen and readJoinedSessions drops the flagged ones — so it is news, and it
  // gets the accent. The pulse stays exclusive to your-turn: that is the one stalling other people,
  // and nobody is waiting on you to read a result.
  it('keeps the pulse off the winner, which is not waiting on anybody', async () => {
    mockedApi.fetchSession.mockResolvedValueOnce({ ...session, winner: 'choice-1' })

    const { container } = renderComponent()

    expect(await screen.findByText('Gates Bar-B-Q won')).toBeInTheDocument()
    expect(container.querySelectorAll('.motion-safe\\:animate-pulse')).toHaveLength(0)
  })

  describe('order and overflow', () => {
    // Declared newest first, which is the order storage returns and therefore the order the
    // component is handed. The winner is deliberately the oldest — under age alone it would be the
    // one the cap dropped — and the two waiting cards straddle the your-turn one so the tie-break
    // has something to decide.
    const four: joinedSessions.JoinedSession[] = [
      { ...entry, joinedAt: now - 6 * MINUTE_MS, sessionId: 'wait-new' },
      { ...entry, joinedAt: now - 12 * MINUTE_MS, sessionId: 'turn-mid' },
      { ...entry, joinedAt: now - 18 * MINUTE_MS, sessionId: 'wait-old' },
      { ...entry, joinedAt: now - 24 * MINUTE_MS, sessionId: 'won-oldest' },
    ]

    const sessionFor = async (sessionId: string): Promise<SessionData> =>
      sessionId === 'won-oldest' ? { ...session, sessionId, winner: 'choice-1' } : { ...session, sessionId }

    // Only turn-mid has a vote outstanding for this device; the rest are waiting on other people.
    const usersFor = async (sessionId: string): Promise<User[]> =>
      sessionId === 'turn-mid' ? [unvoted, marcus] : [voted, marcus]

    // One queued implementation per call the four cards will make, never a bare mockImplementation:
    // clearMocks calls mockClear, which forgets the calls but keeps the implementation, so a
    // permanent stub here would answer for every later test in the file. Queued ones are consumed,
    // which is also why the count has to match — a leftover would leak just as badly.
    const setupFour = (): void => {
      four.forEach(() => mockedApi.fetchSession.mockImplementationOnce(sessionFor))
      four.forEach(() => mockedApi.fetchUsers.mockImplementationOnce(usersFor))
    }

    // The shape the real page has and no other test here reproduces. useJoinedSessions reads storage
    // in an effect, so index.tsx renders ActiveSessions with [] first and the entries arrive a render
    // later. Every other test mounts with the list already populated, which is the one arrangement
    // where an empty first render cannot be observed — and an empty list satisfies `every` vacuously,
    // so a gate that opens on it latches before a single card exists and refuses every report that
    // follows. The suite stays green while the shipped page ranks nothing at all.
    it('ranks a list that arrives after the first render, as it does on the real page', async () => {
      setupFour()
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
      })
      const withEntries = (entries: joinedSessions.JoinedSession[]): React.ReactElement => (
        <QueryClientProvider client={queryClient}>
          <ActiveSessions entries={entries} onDismiss={onDismiss} onGone={onGone} settleTimeoutMs={NEVER} />
        </QueryClientProvider>
      )

      const { rerender } = render(withEntries([]))
      rerender(withEntries(four))

      expect(await screen.findByText('Gates Bar-B-Q won')).toBeInTheDocument()
      expect(cardTargets()).toEqual(['/s/won-oldest', '/s/turn-mid', '/s/wait-new'])
    })

    // NEVER throughout: the give-up timer paints in stored order, so a test rescued by it would pass
    // without any ranking at all.
    it('leads with the winner and then the vote that is blocking, whatever the cap was hiding', async () => {
      setupFour()

      renderComponent(four, { settleTimeoutMs: NEVER })

      expect(await screen.findByText('Gates Bar-B-Q won')).toBeInTheDocument()
      expect(cardTargets()).toEqual(['/s/won-oldest', '/s/turn-mid', '/s/wait-new'])
    })

    // The one the previous test cannot pin, because there every answer lands in the same tick and a
    // gate that waited only on the visible three would have heard from the fourth anyway. Here the
    // hidden entry answers last, and it is the winner — so a gate that opened on the three would
    // have ranked it as `loading`, dropped it out of the cap, and frozen that order for good.
    it('waits for the entry the cap is hiding before deciding what the cap keeps', async () => {
      const late = deferred<SessionData>()
      four.forEach(() =>
        mockedApi.fetchSession.mockImplementationOnce(async (sessionId: string) =>
          sessionId === 'won-oldest' ? late.promise : { ...session, sessionId },
        ),
      )
      four.forEach(() => mockedApi.fetchUsers.mockImplementationOnce(usersFor))

      renderComponent(four, { settleTimeoutMs: NEVER })

      // The roster write-back is the only thing a card does that is visible from outside while the
      // list is still covered, and it needs both the session and the voter list, so the third one
      // arriving means the three the cap would show have all settled.
      await waitFor(() =>
        expect(mockedStore.rememberSession).toHaveBeenCalledWith(
          expect.objectContaining({ names: ['Marcus'], sessionId: 'wait-old' }),
        ),
      )
      expect(screen.queryByRole('link')).not.toBeInTheDocument()

      await act(async () => {
        late.resolve({ ...session, sessionId: 'won-oldest', winner: 'choice-1' })
      })

      expect(await screen.findByText('Gates Bar-B-Q won')).toBeInTheDocument()
      expect(cardTargets()).toEqual(['/s/won-oldest', '/s/turn-mid', '/s/wait-new'])
    })

    // wait-new and wait-old want exactly the same thing, so age is what separates them, and the
    // newer one is the one the cap keeps.
    it('falls through to the newest when two cards want the same thing', async () => {
      setupFour()

      renderComponent(four, { settleTimeoutMs: NEVER })

      await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(3))
      expect(cardTargets()).not.toContain('/s/wait-old')
    })

    // Six, not four. The spec rules out paging — "the entire remaining list at once, no second
    // screen" — and with four entries that claim is untestable: revealing all and revealing one more
    // both produce four cards, so a paging implementation passes. Six is the smallest fixture where
    // `DISPLAY_LIMIT + 1` and `all` differ.
    it('says how many the cap is hiding and reveals all of them at once, without paging', async () => {
      const six = [...four, { ...entry, sessionId: 'extra-a' }, { ...entry, sessionId: 'extra-b' }]
      six.forEach(() => mockedApi.fetchSession.mockImplementationOnce(sessionFor))
      six.forEach(() => mockedApi.fetchUsers.mockImplementationOnce(usersFor))

      renderComponent(six, { settleTimeoutMs: NEVER })

      await userEvent.click(await screen.findByRole('button', { name: 'Show 3 more' }))

      expect(screen.getAllByRole('link')).toHaveLength(6)
      expect(screen.getByRole('button', { name: 'Show fewer' })).toBeInTheDocument()
    })

    it('reveals the hidden cards in their ranked places, not appended to the end', async () => {
      setupFour()

      renderComponent(four, { settleTimeoutMs: NEVER })

      await userEvent.click(await screen.findByRole('button', { name: 'Show 1 more' }))

      expect(cardTargets()).toEqual(['/s/won-oldest', '/s/turn-mid', '/s/wait-new', '/s/wait-old'])
    })

    it('collapses back to the cap', async () => {
      setupFour()

      renderComponent(four, { settleTimeoutMs: NEVER })

      await userEvent.click(await screen.findByRole('button', { name: 'Show 1 more' }))
      await userEvent.click(screen.getByRole('button', { name: 'Show fewer' }))

      expect(screen.getAllByRole('link')).toHaveLength(3)
    })

    it('offers no control when the cap is hiding nothing', async () => {
      renderComponent([entry], { settleTimeoutMs: NEVER })

      expect(await screen.findByRole('link')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /^Show/ })).not.toBeInTheDocument()
    })

    // The control's row is held from the first frame, not conjured at reveal. On mobile the columns
    // stack hero → cards → form, so a row that appears late pushes the create card and its text
    // input down by its own height — the same shift the skeletons exist to prevent, one row lower.
    // The placeholder is a shape, not a control: no button role, nothing focusable.
    it('reserves the overflow control’s row while the cards are still placeholders', async () => {
      four.forEach(() => mockedApi.fetchSession.mockReturnValueOnce(noAnswer<SessionData>()))

      const { container } = renderComponent(four, { settleTimeoutMs: NEVER })

      await waitFor(() => expect(container.querySelectorAll('[data-loading="card"]')).toHaveLength(3))
      expect(screen.getByText('Show more')).toBeInTheDocument()
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    // The timer path is not unranked, and the cap rule has to account for that. Three cards answer
    // and one hangs: the three carry real kinds, the straggler reads as `loading`. Capping would hide
    // exactly the card the list knows least about — the one whose request is still out — so nothing
    // is hidden while anything is unknown.
    it('shows every card when one is still unknown, even though the others ranked', async () => {
      const mixed = [
        { ...entry, joinedAt: now - 6 * MINUTE_MS, sessionId: 'hangs' },
        { ...entry, joinedAt: now - 12 * MINUTE_MS, sessionId: 'wait-a' },
        { ...entry, joinedAt: now - 18 * MINUTE_MS, sessionId: 'wait-b' },
        { ...entry, joinedAt: now - 24 * MINUTE_MS, sessionId: 'won' },
      ]
      mockedApi.fetchSession.mockReturnValueOnce(noAnswer<SessionData>())
      mixed.slice(1).forEach(() => mockedApi.fetchSession.mockImplementationOnce(sessionFor))
      mixed.slice(1).forEach(() => mockedApi.fetchUsers.mockImplementationOnce(usersFor))

      renderComponent(mixed, { settleTimeoutMs: PROMPTLY })

      await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(4))
      expect(screen.queryByRole('button', { name: /Show/ })).not.toBeInTheDocument()
    })

    // A request that fails settles immediately — retry is off — but the card still cannot say what
    // it wants, so it ranks last. Last must not mean hidden: it carries the cached round, roster and
    // address, and it is the one a visitor would tap to try again.
    it('does not hide a card whose request failed behind the cap', async () => {
      const withFailure = [
        { ...entry, joinedAt: now - 6 * MINUTE_MS, sessionId: 'broken' },
        { ...entry, joinedAt: now - 12 * MINUTE_MS, sessionId: 'wait-a' },
        { ...entry, joinedAt: now - 18 * MINUTE_MS, sessionId: 'wait-b' },
        { ...entry, joinedAt: now - 24 * MINUTE_MS, sessionId: 'won' },
      ]
      mockedApi.fetchSession.mockRejectedValueOnce(new Error('offline'))
      withFailure.slice(1).forEach(() => mockedApi.fetchSession.mockImplementationOnce(sessionFor))
      withFailure.slice(1).forEach(() => mockedApi.fetchUsers.mockImplementationOnce(usersFor))

      renderComponent(withFailure, { settleTimeoutMs: NEVER })

      await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(4))
      expect(cardTargets()).toContain('/s/broken')
    })

    // Deleting the choices clause from isSettled leaves every other test green, and the user sees
    // "Winner picked" become "Gates Bar-B-Q won" a beat after the list painted — content changing
    // under a card that was already final, which is the whole thing the gate exists to stop.
    it('waits on the winner\u2019s name, not just on the session that says there is one', async () => {
      mockedApi.fetchSession.mockResolvedValueOnce({ ...session, winner: 'choice-1' })
      mockedApi.fetchChoices.mockReturnValueOnce(noAnswer<ChoicesMap>())

      const { container } = renderComponent([entry], { settleTimeoutMs: NEVER })

      // Awaiting the call, not just the skeleton: the skeleton is there from the first frame, so
      // asserting it alone would finish before the choices query even fires — leaving its queued
      // mock behind to answer for whichever test ran next.
      await waitFor(() => expect(mockedApi.fetchChoices).toHaveBeenCalled())

      expect(container.querySelectorAll('[data-loading="card"]')).toHaveLength(1)
      expect(screen.queryByText(/Winner picked/)).not.toBeInTheDocument()
    })

    // react-query holds requests while the device is offline: status stays pending, forever, with no
    // error to end it. This is an installable PWA, so opening it offline is ordinary — and without
    // the paused clause the whole rail shimmers out the full timer before drawing cards it already
    // has. NEVER here, so only the clause itself can let this through.
    it('paints from the stored record while the device is offline', async () => {
      onlineManager.setOnline(false)

      try {
        renderComponent([entry], { settleTimeoutMs: NEVER })

        expect(await screen.findByText(/4102 Main St/)).toBeInTheDocument()
      } finally {
        onlineManager.setOnline(true)
      }
    })

    // Every mounted card fetches whether or not the cap shows it, and the gate waits on all of them,
    // so what mounts has to be bounded or a device with a long history decides how long three cards
    // take to appear. Eight records, two of which are never asked for until the visitor expands.
    it('does not fetch for records far past the cap', async () => {
      const eight = Array.from({ length: 8 }, (_, index) => ({
        ...entry,
        joinedAt: entry.joinedAt - index * MINUTE_MS,
        sessionId: `s${index}`,
      }))
      // Exactly six queued, matching what should mount. Queue eight and the two spares outlive this
      // test and answer for the next one — and if the bound ever regresses, the extra calls fall
      // through to the file's permanent mock, so the count assertion still catches it.
      Array.from({ length: 6 }, () =>
        mockedApi.fetchSession.mockImplementationOnce(async (id: string) => ({ ...session, sessionId: id })),
      )
      Array.from({ length: 6 }, () => mockedApi.fetchUsers.mockImplementationOnce(usersFor))

      renderComponent(eight, { settleTimeoutMs: NEVER })

      await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(3))
      expect(mockedApi.fetchSession).toHaveBeenCalledTimes(6)
    })

    // The counterweight to the freeze below. Refusing late answers is right for cards already on
    // screen, but the cap decides which cards those ARE — and on this path nothing was ever ranked,
    // so applying it would hide entries by an ordering the component itself could not compute. With
    // four records and a winner that answers last, the cap would have left the winner off the page
    // for as long as it stayed open, behind a control nobody has a reason to press. So the timer
    // path shows everything: a longer list than anyone wanted, rather than a quietly wrong one.
    it('shows every card when the timer paints, rather than capping by a rank it never computed', async () => {
      const unanswered = ['a', 'b', 'c', 'd'].map((sessionId, index) => ({
        ...entry,
        joinedAt: entry.joinedAt - index * MINUTE_MS,
        sessionId,
      }))
      unanswered.forEach(() => mockedApi.fetchSession.mockReturnValueOnce(noAnswer<SessionData>()))

      renderComponent(unanswered, { settleTimeoutMs: PROMPTLY })

      await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(4))
      expect(screen.queryByRole('button', { name: /Show/ })).not.toBeInTheDocument()
    })

    // The give-up timer paints with cards still in flight, and their answers land afterwards. The
    // card is welcome to fill in what it learns — the winner's name appears here — but the list has
    // already been read by then, and a card that changed places under a thumb already reaching for
    // it is the exact failure the paint gate exists to prevent.
    it('does not reorder itself when an answer arrives after it has painted', async () => {
      const late = deferred<SessionData>()
      const two = [
        { ...entry, sessionId: 'first' },
        { ...entry, joinedAt: entry.joinedAt - MINUTE_MS, sessionId: 'second' },
      ]
      mockedApi.fetchSession.mockReturnValueOnce(noAnswer<SessionData>()).mockReturnValueOnce(late.promise)

      renderComponent(two, { settleTimeoutMs: PROMPTLY })

      await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(2))
      expect(cardTargets()).toEqual(['/s/first', '/s/second'])

      // A winner outranks everything, so this is the answer most able to move a card.
      await act(async () => {
        late.resolve({ ...session, sessionId: 'second', winner: 'choice-1' })
      })

      expect(await screen.findByText('Gates Bar-B-Q won')).toBeInTheDocument()
      expect(cardTargets()).toEqual(['/s/first', '/s/second'])
    })
  })
})
