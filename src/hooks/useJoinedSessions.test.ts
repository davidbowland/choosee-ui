import { createElement } from 'react'
import { renderToString } from 'react-dom/server'

import { useJoinedSessions } from './useJoinedSessions'
import { act, renderHook } from '@testing-library/react'
import * as joinedSessions from '@utils/joined-sessions'

jest.mock('@utils/joined-sessions')

const mockedStore = joinedSessions as jest.Mocked<typeof joinedSessions>

/** A component rather than a bare hook call: renderToString needs something to render. */
const Harness = (): null => {
  useJoinedSessions()
  return null
}

const entry = (sessionId: string): joinedSessions.JoinedSession => ({
  address: '4102 Main St',
  currentRound: 1,
  joinedAt: 1_700_000_000_000,
  sessionId,
  totalRounds: 3,
  userId: 'user-1',
})

/**
 * `document.documentElement` is the one piece of state every test in this file shares, and the hook
 * only ever writes to it — nothing unmounts it back. Called explicitly by the tests that read it, so
 * a pass means the hook set the attribute in that test rather than inheriting it from the last one.
 */
const resetDocument = (): void => {
  delete document.documentElement.dataset.resume
}

describe('useJoinedSessions', () => {
  beforeAll(() => {
    mockedStore.readJoinedSessions.mockReturnValue([entry('abcd'), entry('efgh')])
  })

  afterAll(resetDocument)

  it('reads the stored entries after mount', () => {
    const { result } = renderHook(() => useJoinedSessions())

    expect(result.current.entries.map((session) => session.sessionId)).toEqual(['abcd', 'efgh'])
  })

  // The distinction the field exists for, and the one the page test cannot make because it mocks
  // this hook. "Not read yet" and "read, and empty" both present as an empty list, and anything the
  // page renders before hydration has to tell them apart or it will be missing from the static
  // export and drop in a frame later.
  it('reports whether storage has been read, not merely whether the list is empty', () => {
    mockedStore.readJoinedSessions.mockReturnValueOnce([])

    const { result } = renderHook(() => useJoinedSessions())

    expect(result.current).toEqual(expect.objectContaining({ entries: [], hasLoaded: true }))
  })

  it('does not claim to have loaded before the reading effect runs', () => {
    let seen: boolean | undefined
    const Probe = (): null => {
      seen = seen ?? useJoinedSessions().hasLoaded
      return null
    }

    renderToString(createElement(Probe))

    expect(seen).toBe(false)
  })

  // The hazard the effect exists to avoid, pinned rather than described. `/` is statically exported,
  // so a build-time render that touched localStorage would emit markup the server never generated —
  // and moving the read into useState's initializer, which is the tempting simplification, does
  // exactly that while leaving every other test in this file green.
  it('does not touch storage while rendering, only after mounting', () => {
    renderToString(createElement(Harness))

    expect(mockedStore.readJoinedSessions).not.toHaveBeenCalled()
  })

  // Both halves matter. Flagging without dropping leaves the card on screen until the next reload;
  // dropping without flagging brings it back on that reload.
  it('flags and drops a dismissed entry', () => {
    const { result } = renderHook(() => useJoinedSessions())

    act(() => result.current.onDismiss('abcd'))

    expect(mockedStore.dismissSession).toHaveBeenCalledWith('abcd')
    expect(result.current.entries.map((session) => session.sessionId)).toEqual(['efgh'])
  })

  it('deletes and drops an entry the server has forgotten', () => {
    const { result } = renderHook(() => useJoinedSessions())

    act(() => result.current.onGone('efgh'))

    expect(mockedStore.forgetSession).toHaveBeenCalledWith('efgh')
    expect(result.current.entries.map((session) => session.sessionId)).toEqual(['abcd'])
  })

  // The inline script in _document guesses this attribute before first paint from a single stored
  // timestamp. These pin the correction: whatever the guess was, the hook's real list decides.
  describe('the layout attribute', () => {
    it('marks the document when there is something to pick back up', () => {
      resetDocument()

      renderHook(() => useJoinedSessions())

      expect(document.documentElement.dataset.resume).toEqual('1')
    })

    // The scenario the whole mechanism is built for: the script has already marked the document and
    // the hook must decide whether to keep the mark.
    it('leaves a correct guess alone', () => {
      document.documentElement.dataset.resume = '1'

      renderHook(() => useJoinedSessions())

      expect(document.documentElement.dataset.resume).toEqual('1')
    })

    // Asserting the final value is not enough, and this is the trap the test above falls into on its
    // own: a hook that deletes the attribute on mount and restores it on the next render ends at '1'
    // either way, because act() flushes both effects before the assertion runs. In a browser those
    // are two scheduler tasks and the paint between them is the flash.
    //
    // So this reconstructs every value the attribute held. Each record carries the value before it,
    // and the value after the last one is the current one, which makes the whole sequence readable
    // from a synchronous takeRecords() — no waiting on the observer's microtask.
    it('never removes a correct guess, not even for one frame', () => {
      document.documentElement.dataset.resume = '1'
      const observer = new MutationObserver(() => undefined)
      observer.observe(document.documentElement, { attributeFilter: ['data-resume'], attributeOldValue: true })

      renderHook(() => useJoinedSessions())

      const history = [
        ...observer.takeRecords().map((record) => record.oldValue),
        document.documentElement.getAttribute('data-resume'),
      ]
      observer.disconnect()

      expect(history).not.toContain(null)
    })

    // A guess the record no longer supports — the hint outliving its list, which syncHint's
    // swallowed removeItem makes possible. The wrong hero paints for a frame; the hook takes it back.
    it('takes back a guess the stored list does not support', () => {
      document.documentElement.dataset.resume = '1'
      mockedStore.readJoinedSessions.mockReturnValueOnce([])

      renderHook(() => useJoinedSessions())

      expect(document.documentElement.dataset.resume).toBeUndefined()
    })

    // Emptying the list is something the user did, seconds after the page settled. Regrowing the
    // headline at that moment is the movement this feature exists to remove, so the mode latches:
    // the cards go, the compact layout stays.
    it('keeps the compact layout when the last card is dismissed', () => {
      resetDocument()
      const { result } = renderHook(() => useJoinedSessions())

      act(() => result.current.onDismiss('abcd'))
      act(() => result.current.onDismiss('efgh'))

      expect(document.documentElement.dataset.resume).toEqual('1')
    })

    it('leaves the document unmarked for a first-time visitor', () => {
      resetDocument()
      mockedStore.readJoinedSessions.mockReturnValueOnce([])

      renderHook(() => useJoinedSessions())

      expect(document.documentElement.dataset.resume).toBeUndefined()
    })
  })
})
