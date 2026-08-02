import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { JoinedSession, dismissSession, forgetSession, readJoinedSessions } from '@utils/joined-sessions'

/**
 * A layout effect in the browser, a plain one on the server.
 *
 * The attribute below decides the hero's size, so it has to be written in the same frame as the
 * commit that reveals the cards — a passive effect runs after the browser is free to paint, which on
 * the migration path (a device whose record predates the hint key, so the inline script finds
 * nothing) turns one correction into two visible stages: cards appear beside the full hero, then the
 * hero shrinks. useLayoutEffect has no meaning during the static export and React warns about it, so
 * the server gets the passive one; there is nothing to lay out there anyway.
 */
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export interface JoinedSessions {
  entries: JoinedSession[]
  /**
   * Whether storage has actually been read yet, which is not the same as "the list is empty".
   *
   * The page needs the difference for anything it renders before hydration: `entries` is `[]` during
   * the static export and for the first render after it, so a `length > 0` test alone would leave
   * that thing out of the prerendered markup and drop it in a frame later, moving whatever sits
   * beneath it.
   */
  hasLoaded: boolean
  onDismiss: (sessionId: string) => void
  onGone: (sessionId: string) => void
}

/**
 * The Choosees this device joined and has not finished, and the two ways one leaves the list.
 *
 * Lives on the page rather than inside ActiveSessions because the page's layout depends on whether
 * there are any: two callers would mean two independent copies of one list, and a dismissal that
 * updated only one of them.
 */
export function useJoinedSessions(): JoinedSessions {
  // null means "storage not read yet", which is a different thing from "read, and empty". The
  // layout effect below has to tell them apart: an empty array on the very first render would look
  // exactly like a first-time visitor and tear the pre-paint guess off the document.
  const [entries, setEntries] = useState<JoinedSession[] | null>(null)

  // After mount, never during render. This page is statically prerendered, so reading storage in
  // render would produce client markup the build never generated.
  useEffect(() => {
    setEntries(readJoinedSessions())
  }, [])

  // The inline script in _document guesses this before first paint so the correct hero is in the
  // very first frame. This is the correction: on the one page that has the real list, a guess the
  // record no longer supports gets taken back.
  //
  // Three-valued on purpose. Running this with `entries` still at its initial value would delete the
  // attribute on mount and restore it a scheduler task later — React commits the read effect's
  // setEntries at default priority, so the re-render is a separate task and the browser is free to
  // paint between the two. That is the full-hero-then-compact flash this whole feature exists to
  // remove, reintroduced by the code meant to prevent it.
  //
  // And once resume mode is chosen it latches. The list can empty under the user — a dismissal, or a
  // 404 retiring the last card — and regrowing the headline at that moment is exactly the movement
  // the spec rules out. Only a guess that was wrong from the start is taken back.
  const hasEntries = entries === null ? null : entries.length > 0
  const isResuming = useRef(false)
  useIsomorphicLayoutEffect(() => {
    if (hasEntries === null) return
    const root = document.documentElement
    if (hasEntries) {
      root.dataset.resume = '1'
      isResuming.current = true
      return
    }
    if (isResuming.current) return
    delete root.dataset.resume
  }, [hasEntries])

  const drop = useCallback((sessionId: string) => {
    setEntries((current) => (current ?? []).filter((entry) => entry.sessionId !== sessionId))
  }, [])

  // Both halves matter. Flagging without dropping leaves a dismissed card on screen until the next
  // reload; dropping without flagging brings it back on that reload.
  const onDismiss = useCallback(
    (sessionId: string) => {
      dismissSession(sessionId)
      drop(sessionId)
    },
    [drop],
  )

  const onGone = useCallback(
    (sessionId: string) => {
      forgetSession(sessionId)
      drop(sessionId)
    },
    [drop],
  )

  // The null is an internal detail; callers only ever needed "the list", and empty is the honest
  // answer while it is still being read.
  return { entries: entries ?? [], hasLoaded: entries !== null, onDismiss, onGone }
}
