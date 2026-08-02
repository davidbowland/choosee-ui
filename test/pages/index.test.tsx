import React from 'react'

import ActiveSessions from '@components/active-sessions'
import AppBar from '@components/app-bar'
import PrivacyLink from '@components/privacy-link'
import SessionCreate from '@components/session-create'
import { useJoinedSessions } from '@hooks/useJoinedSessions'
import Index from '@pages/index'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

jest.mock('@components/active-sessions')
jest.mock('@components/app-bar')
jest.mock('@components/privacy-link')
jest.mock('@components/session-create')
jest.mock('@hooks/useJoinedSessions')

// Values the page could not have invented. An empty array and a bare arrow are things `Index` can
// produce for itself, so asserting those would pass just as well against a page that never called
// the hook at all — see the wiring test below.
const entries = [
  {
    address: '4102 Main St',
    currentRound: 1,
    joinedAt: 1_700_000_000_000,
    sessionId: 'abcd',
    totalRounds: 3,
    userId: 'user-1',
  },
]
const onDismiss = jest.fn()
const onGone = jest.fn()

describe('Index page', () => {
  beforeAll(() => {
    jest.mocked(useJoinedSessions).mockReturnValue({ entries, hasLoaded: true, onDismiss, onGone })
    jest.mocked(ActiveSessions).mockReturnValue(<></>)
    jest.mocked(AppBar).mockReturnValue(<></>)
    jest.mocked(PrivacyLink).mockReturnValue(<></>)
    jest.mocked(SessionCreate).mockReturnValue(<></>)
  })

  it('should render AppBar', () => {
    render(<Index />)
    expect(AppBar).toHaveBeenCalledTimes(1)
  })

  it('should render SessionCreate', () => {
    render(<Index />)
    expect(SessionCreate).toHaveBeenCalledTimes(1)
  })

  it('should render ActiveSessions', () => {
    render(<Index />)
    expect(ActiveSessions).toHaveBeenCalledTimes(1)
  })

  // The seam the refactor created. The list is the page's now and ActiveSessions cannot read it for
  // itself, so nothing but this says the two are actually connected — and TypeScript already rejects
  // dropping the props outright, which is the only failure a shape-matcher would have caught.
  //
  // Identity equality on all three, deliberately. `expect.objectContaining` with `entries: []` and
  // `expect.any(Function)` passes against `entries={[]} onDismiss={() => undefined}` — a page with
  // the hook fully disconnected, where no card can ever render and no dismissal can ever reach
  // storage. Only the exact references rule that out.
  it('should hand ActiveSessions the hook’s own list and handlers, not substitutes', () => {
    render(<Index />)

    expect(ActiveSessions).toHaveBeenCalledWith({ entries, onDismiss, onGone }, undefined)
  })

  // Both headline variants are in the markup at all times; only CSS decides which one is on screen.
  // The point of shipping both is that neither waits on hydration, so a test that finds only one of
  // them is a test finding a page that has gone back to choosing in React. The single `h1` is the
  // other half of the deal: one heading serves both settings, so the document outline never grows a
  // second level-one heading that nobody can see.
  it('should offer both the pitch and the short headline, so neither waits on hydration', () => {
    const { container } = render(<Index />)

    expect(container.querySelectorAll('[data-hero="full"]')).toHaveLength(1)
    expect(container.querySelectorAll('[data-hero="compact"]')).toHaveLength(1)
    expect(container.querySelectorAll('h1')).toHaveLength(1)
  })

  // The line breaks are display:none in the compact setting, so the only thing holding WHERE ARE
  // off WE is the explicit space after each line. Delete it and the markup still looks correct in
  // review — the returning visitor is the one who gets WHERE AREWE EATING?
  it('should keep the headline’s words apart once the line breaks collapse', () => {
    const { container } = render(<Index />)

    expect(container.querySelector('h1')?.textContent).toBe('WHERE ARE WE EATING?')
  })

  // Demotes the create card while there is something else worth picking back up. Keyed on the list
  // rather than on data-resume: that attribute latches so the headline cannot regrow, and a latched
  // label would go on saying "Start another Choosee" after you dismissed the only other one.
  it('should label the create card as secondary while there are Choosees to resume', () => {
    render(<Index />)

    expect(screen.getByRole('heading', { name: 'Start another Choosee' })).toBeInTheDocument()
  })

  it('should leave the create card unlabeled once storage says there is nothing to resume', () => {
    jest.mocked(useJoinedSessions).mockReturnValueOnce({ entries: [], hasLoaded: true, onDismiss, onGone })

    render(<Index />)

    expect(screen.queryByText('Start another Choosee')).not.toBeInTheDocument()
  })

  // The prerendered frame, where entries is always [] because storage has not been read. Keying the
  // label on `length > 0` alone would leave it out of the static markup and drop it in a frame later,
  // pushing the create card and its text input down. CSS is what keeps it off a first-time visitor's
  // page, not its absence from the DOM.
  it('should ship the label in the markup before storage has been read', () => {
    jest.mocked(useJoinedSessions).mockReturnValueOnce({ entries: [], hasLoaded: false, onDismiss, onGone })

    render(<Index />)

    expect(screen.getByRole('heading', { name: 'Start another Choosee' })).toBeInTheDocument()
  })

  // The hooks every rule in the new CSS block hangs off. They are structural markers, not styling —
  // the same thing `data-hero` is, and asserted for the same reason. Without this, deleting
  // `home-grid` from the wrapper takes the whole feature with it in silence: `.home-grid .hero-title`
  // stops matching so the headline has no size rule in either mode, the compact subhead never
  // appears, the full one never hides, and the columns never top-align. Every other test here stays
  // green, because none of them can see a stylesheet.
  it('should carry the hooks the stylesheet switches on', () => {
    const { container } = render(<Index />)

    expect(container.querySelectorAll('.home-grid')).toHaveLength(1)
    expect(container.querySelectorAll('.home-grid .hero-title')).toHaveLength(1)
    expect(container.querySelectorAll('.home-grid .resume-only')).toHaveLength(1)
  })

  // Both breaks, specifically. Losing one gives the returning visitor a two-line compact hero and
  // losing both gives three lines, and neither changes the headline's textContent — so the test that
  // pins the words cannot see it.
  it('should mark both line breaks so the compact hero collapses to one line', () => {
    const { container } = render(<Index />)

    expect(container.querySelectorAll('h1 br.hero-break')).toHaveLength(2)
  })

  // Dismissing the last card cannot regrow the headline, but the subhead below it can come back —
  // nothing sits under it once the cards are gone, so the swap moves nothing, and the full pitch is
  // the right copy for somebody who no longer has anything running.
  it('should mark the layout when the last Choosee has gone, so the pitch can come back', () => {
    jest.mocked(useJoinedSessions).mockReturnValueOnce({ entries: [], hasLoaded: true, onDismiss, onGone })

    const { container } = render(<Index />)

    expect(container.querySelectorAll('.home-grid.resume-empty')).toHaveLength(1)
  })

  it('should not mark it while there is still something to pick back up', () => {
    const { container } = render(<Index />)

    expect(container.querySelectorAll('.home-grid.resume-empty')).toHaveLength(0)
  })

  it('should render PrivacyLink', () => {
    render(<Index />)
    expect(PrivacyLink).toHaveBeenCalledTimes(1)
  })
})
