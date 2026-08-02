import { useQuery } from '@tanstack/react-query'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ListHeading, ResumeCard, ResumeCardSkeleton, ShowMore, ShowMorePlaceholder } from './elements'
import { CardState, deriveCardState, deriveRoster, deriveTimeNote, formatRoster, rankCardKind } from './helpers'
import { fetchChoices, fetchSession, fetchUsers, hasStatusCode } from '@services/api'
import { ChoicesMap, SessionData, User } from '@types'
import { DISPLAY_LIMIT, JoinedSession, rememberSession } from '@utils/joined-sessions'

interface CardProps {
  entry: JoinedSession
  isHidden: boolean
  isRevealed: boolean
  onDismiss: (sessionId: string) => void
  onGone: (sessionId: string) => void
  onState: (sessionId: string, kind: CardState['kind'], isSettled: boolean) => void
}

const Card = ({ entry, isHidden, isRevealed, onDismiss, onGone, onState }: CardProps): React.ReactNode => {
  const { sessionId } = entry

  // The session page's exact query keys, so tapping a card lands on a warm cache.
  const {
    data: session,
    error: sessionError,
    fetchStatus: sessionFetchStatus,
    isPending: sessionPending,
  } = useQuery<SessionData>({
    queryFn: () => fetchSession(sessionId),
    queryKey: ['session', sessionId],
  })

  // Gated on isReady, matching the session page. A record is only ever written on join, and joining
  // requires a ready session, so a remembered Choosee was ready when it was remembered. Ungating
  // would render "Round 1 of 0 — 0 of 0 voted" off an empty bracket.
  const usersEnabled = session?.isReady === true
  const {
    data: users,
    fetchStatus: usersFetchStatus,
    isPending: usersPending,
  } = useQuery<User[]>({
    enabled: usersEnabled,
    queryFn: () => fetchUsers(sessionId),
    queryKey: ['users', sessionId],
  })

  // session.winner is a choiceId; only ChoicesMap knows the name. An in-progress Choosee never
  // fires this, so naming the winner costs nothing until there is one.
  const choicesEnabled = session?.winner != null
  const {
    data: choices,
    fetchStatus: choicesFetchStatus,
    isPending: choicesPending,
  } = useQuery<ChoicesMap>({
    enabled: choicesEnabled,
    queryFn: () => fetchChoices(sessionId),
    queryKey: ['choices', sessionId],
    staleTime: Infinity,
  })

  // Whether this card is done changing, which is what the list waits on before painting anything.
  //
  // Settlement comes from query status, never from the derived kind: deriveCardState reports
  // `loading` both while a request is in flight and when it failed outright, and those two need
  // opposite answers. Retry is off globally (_app.tsx), so a failure settles at once and the card
  // paints whatever the stored record holds — whereas gating on `data !== undefined` would leave a
  // card that is never going to load shimmering for as long as the page is open.
  //
  // A disabled query reports pending forever, because "pending" in react-query means "has no data"
  // and a query that never runs never will. So each secondary query only counts while it is enabled,
  // and an unready session or one with no winner simply has nothing to wait for.
  //
  // A paused fetch counts as settled too. react-query's default networkMode holds requests while
  // navigator.onLine is false — status stays pending, forever, with no error to end it. This is an
  // installable PWA, so opening it offline is an ordinary thing to do, and without this every
  // offline load waits out the full give-up timer before showing cards it could have drawn from the
  // stored record immediately.
  const queryDone = (isPending: boolean, fetchStatus: string): boolean => !isPending || fetchStatus === 'paused'
  const isSettled =
    queryDone(sessionPending, sessionFetchStatus) &&
    (!usersEnabled || queryDone(usersPending, usersFetchStatus)) &&
    (!choicesEnabled || queryDone(choicesPending, choicesFetchStatus))

  // A 404 on the SESSION is authoritative: Choosees expire after 24 hours and the server forgets
  // them. Any other failure is a blip, and a blip is not a reason to delete somebody's card.
  //
  // Deliberately not also keyed on the users query. onGone is the one genuine delete in the whole
  // module — everything else flags — and retry is off globally, so a single 404 from the secondary
  // endpoint for a reason unrelated to expiry (a deploy window, a gateway 404) would strip the
  // identity from every card on every device with this page open, with no undo. The next time those
  // people opened their link they would meet the name picker and vote as a second person, forking
  // their votes: exactly what the flag-don't-delete design exists to prevent. A live session's 404
  // covers real expiry on its own, and the users query cannot even fire unless the session loaded.
  const isGone = hasStatusCode(sessionError, 404)
  useEffect(() => {
    if (isGone) onGone(sessionId)
  }, [isGone, onGone, sessionId])

  // Memoized because it is an effect dependency below, and a fresh array on every render would
  // rewrite storage on every render. Both inputs are stable references — entry comes from state,
  // users from the query cache — so this recomputes only when the roster can actually have changed.
  const rosterNames = useMemo(
    () => deriveRoster({ cached: entry.names, userId: entry.userId, users }),
    [entry.names, entry.userId, users],
  )

  // Refresh what the next first paint will read. The record is otherwise written only at join time,
  // so someone who joined at round 0 and comes back three rounds later would be shown "Round 1 of 5"
  // before it snapped to "Round 4 of 5" — a stale round is worse than no round. rememberSession
  // preserves joinedAt and any flags, so this cannot extend the TTL or resurrect a dismissed card.
  // Gated on isReady for the same reason the users query above is: a not-ready session has an empty
  // bracket, and caching its zeros would paint "Round 1 of 0" on the next first load.
  const { address, currentRound, isReady, totalRounds } = session ?? {}
  useEffect(() => {
    if (!isReady || address === undefined || currentRound === undefined || totalRounds === undefined) return
    // The names key is omitted rather than written as undefined when the voter list has not arrived:
    // rememberSession merges over the previous record, so an explicit undefined would erase a roster
    // this device already knew and put the next first paint back where it started.
    rememberSession({
      address,
      currentRound,
      ...(rosterNames.length > 0 && { names: rosterNames }),
      sessionId,
      totalRounds,
      userId: entry.userId,
    })
  }, [address, currentRound, isReady, rosterNames, totalRounds, sessionId, entry.userId])

  // The cached entry supplies the address and round for first paint. It does not stand in for a
  // SessionData — no session means loading, and deriveCardState says so itself.
  const state = deriveCardState({
    cached: { currentRound: entry.currentRound, totalRounds: entry.totalRounds },
    choices,
    session,
    userId: entry.userId,
    users,
  })

  // Primitives, never the CardState object: deriveCardState builds a fresh one on every render, so
  // passing it here would list a new value in the dependency array every time and re-fire this
  // effect forever. The kind and the settled flag are the only two things the list needs.
  useEffect(() => {
    onState(sessionId, state.kind, isSettled)
  }, [isSettled, onState, sessionId, state.kind])

  // Both returns sit below the queries and the effects above, so a card that is not on screen still
  // fetches, still reports, and still tells the list it can stop waiting. That is not an
  // optimization, it is what makes the list orderable: the cap is applied to the ranked list, so
  // whether an entry belongs on screen at all depends on the kind of every entry, including the ones
  // it is currently hiding. A card that never mounted would report nothing, rank last forever, and —
  // since the paint gate waits on every entry — hold the whole rail at a shimmer until the give-up
  // timer fired.
  //
  // Hidden before unrevealed: the skeletons stand in for the cap's worth of cards, not for the whole
  // record. Someone with twelve remembered Choosees would otherwise meet twelve placeholders and
  // then three cards.
  if (isHidden) return null
  if (!isRevealed) return <ResumeCardSkeleton />

  return (
    <ResumeCard
      address={session?.address ?? entry.address}
      isSettled={isSettled}
      onDismiss={() => onDismiss(sessionId)}
      roster={formatRoster(rosterNames)}
      sessionId={sessionId}
      state={state}
      time={deriveTimeNote(entry.joinedAt)}
    />
  )
}

/**
 * How long to wait on a request that neither responds nor errors before painting anyway.
 *
 * A captive portal or a dead network produces exactly that, and without a deadline it would hold the
 * whole rail at a shimmer for as long as the page stayed open. Giving up lands on stored order and
 * cached content, which is the behavior that shipped before the paint gate existed — so the fallback
 * is the old page, not a blank one.
 *
 * Injectable, per CLAUDE.md's rule for anything non-deterministic: a test that needs the timer to
 * fire passes a small value and one that must not see it passes a large one, with real timers
 * throughout. Faking the clock instead would fight active-sessions.test.tsx's existing decision to
 * leave setTimeout alone, which react-query and userEvent both depend on.
 */
const SETTLE_TIMEOUT_MS = 3_000

/**
 * How many cards mount while the list is capped.
 *
 * Ranking has to see past the cap to know whether something outside it belongs inside, so this is
 * larger than DISPLAY_LIMIT — but every mounted card fetches whether or not it is on screen, and the
 * paint gate waits on all of them. Twice the cap keeps the ranking honest without letting a device
 * that has joined twenty Choosees decide how long three cards take to appear.
 */
const MOUNT_LIMIT = DISPLAY_LIMIT * 2

interface CardReport {
  isSettled: boolean
  kind: CardState['kind']
}

export interface ActiveSessionsProps {
  entries: JoinedSession[]
  onDismiss: (sessionId: string) => void
  onGone: (sessionId: string) => void
  settleTimeoutMs?: number
}

/**
 * Choosees this device joined and has not finished. Nothing renders when there are none: a
 * first-time visitor sees the home page exactly as it was before this existed.
 *
 * Presentational — the list itself belongs to useJoinedSessions, because the page's layout depends
 * on it too. Owning it here as well would give one page two independent copies of one list, and a
 * dismissal that updated only one of them.
 *
 * Nothing paints until every card has settled: a card's state is what orders this list, and ordering
 * against half-loaded cards would move them one at a time as their requests land, under a thumb
 * already reaching for one. Until then it is one skeleton per visible slot — the count is known
 * synchronously from storage, so it is the right number of them at the right height — and then the
 * whole list appears at once, ranked, and does not move again.
 *
 * Ranked by what each card wants from you, then by age, then cut to DISPLAY_LIMIT with a control
 * that lifts the cap. The cap is only honest if the three it keeps are the three that matter, which
 * is why the rank has to come first and why the cut cannot be made before the ranking is possible.
 */
const ActiveSessions = ({
  entries,
  onDismiss,
  onGone,
  settleTimeoutMs = SETTLE_TIMEOUT_MS,
}: ActiveSessionsProps): React.ReactNode => {
  const [reports, setReports] = useState<Record<string, CardReport>>({})
  const [gaveUp, setGaveUp] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setGaveUp(true), settleTimeoutMs)
    return () => clearTimeout(timer)
  }, [settleTimeoutMs])

  // Shuts the door on the order the instant the list is painted, because after that point every
  // report is late by definition and acting on one would move a card under a thumb.
  //
  // The give-up path is where late reports actually come from: the timer paints in stored order with
  // cards still in flight, and their answers land afterwards. A card is free to fill in its own
  // content when that happens — "Round 2 of 3" becoming "Thai Kitchen won" is the card telling the
  // truth as it learns it — but the list it sits in has already been read.
  //
  // A ref rather than state because onState must stay referentially stable: it is a dependency of
  // every card's reporting effect, and a new identity would re-fire all of them.
  const isOrderFinal = useRef(false)

  const onState = useCallback((sessionId: string, kind: CardState['kind'], isSettled: boolean) => {
    if (isOrderFinal.current) return
    setReports((current) => {
      // Bail on a report that says nothing new. The cards' reporting effect is the only writer here
      // and a new object every call would re-render every card for no reason — and would turn any
      // future change that made this callback unstable into an unbounded loop rather than a bug.
      const previous = current[sessionId]
      if (previous?.isSettled === isSettled && previous?.kind === kind) return current
      return { ...current, [sessionId]: { isSettled, kind } }
    })
  }, [])

  // One-way. Settled cards turning into skeletons again, or content vanishing in answer to a tap,
  // must not become reachable by loosening some other decision elsewhere.
  //
  // This used to carry three states, separating "every card answered" from "the timer fired". That
  // distinction turned out to be the wrong question: what governs the cap is whether any card's kind
  // is still unknown, which the timer path and a failed request reach alike. Nothing read the third
  // state once that rule landed, so it is gone.
  const [hasRevealed, setHasRevealed] = useState(false)

  // The `entries.length > 0` guard is not defensive, it is the difference between this feature
  // working and not existing. useJoinedSessions reads storage in an effect, so the page's first
  // render hands this component an empty list — and `[].every(...)` is vacuously true. Without the
  // guard the list "settles" on that first render, the reveal latches before a single card has
  // mounted, every report that follows is refused, and the shipped page paints unranked from cache
  // with no skeleton and no winner first. It reached production review undetected because every test
  // then mounted with the list already populated; `'ranks a list that arrives after the first
  // render'` is the one that now renders it the way the page does.
  // What actually mounts, and therefore what the gate waits on. Ranking needs the kind of an entry
  // the cap might be hiding, so this has to be more than DISPLAY_LIMIT — but it must not be "all of
  // them". readJoinedSessions is uncapped up to STORAGE_LIMIT, each card fires up to three requests,
  // and the gate is only as fast as the slowest of them: twenty records would mean sixty requests
  // deciding when three cards appear, and a shimmer whose length is a function of how much history
  // the device holds rather than of what is on screen. Twice the cap is enough for the ranking to be
  // able to promote something the cap was hiding, and bounds the cost at six.
  //
  // Expanding lifts it, because the visitor has just asked for the rest and is willing to wait.
  const mountable = isExpanded ? entries : entries.slice(0, MOUNT_LIMIT)
  const hasSettled = mountable.length > 0 && mountable.every((entry) => reports[entry.sessionId]?.isSettled === true)

  useEffect(() => {
    if (hasRevealed || entries.length === 0) return
    if (!hasSettled && !gaveUp) return
    isOrderFinal.current = true
    setHasRevealed(true)
  }, [entries.length, gaveUp, hasRevealed, hasSettled])

  const isRevealed = hasRevealed

  // Sorted only once the list is revealed, and from that render on the reports behind it can no
  // longer change, so this settles on one order and keeps it. Missing reports read as `loading`,
  // which is where a card that cannot say what it wants belongs anyway.
  //
  // The tie-break restates what storage already returns — newest first — rather than leaning on sort
  // stability, so the order survives anyone reaching for a different comparator later.
  const ordered = useMemo(() => {
    if (!isRevealed) return mountable
    return [...mountable].sort(
      (a, b) =>
        rankCardKind(reports[a.sessionId]?.kind ?? 'loading') - rankCardKind(reports[b.sessionId]?.kind ?? 'loading') ||
        b.joinedAt - a.joinedAt,
    )
  }, [isRevealed, mountable, reports])

  // The cap hides cards, so it is only defensible when every card could say what it is. A `loading`
  // rank does not mean "least important", it means "unknown" — and it is reachable in three ways: a
  // request still in flight when the give-up timer fired, one that failed outright, and a Choosee
  // the server has not finished building. All three sort last, so capping would hide exactly the
  // cards the list knows least about, including the failed one a visitor might want to tap to retry.
  //
  // Note the timer path is not unranked, which an earlier version of this rule assumed: cards report
  // on every state change, so when the timer fires the ones that already answered carry real kinds
  // and only the stragglers read as `loading`. The ranking is partial, not absent — which is why the
  // question here is "is anything unknown" rather than "how did this list come to be painted".
  //
  // While waiting, nothing is known yet and the count is still exact — `ordered` is `entries` — so
  // the placeholder below can reserve the overflow row before any card has answered.
  const isEverythingKnown = ordered.every((entry) => (reports[entry.sessionId]?.kind ?? 'loading') !== 'loading')
  const isCapped = !isRevealed || isEverythingKnown
  const hidden = isCapped ? entries.length - DISPLAY_LIMIT : 0
  const visibleCount = isCapped && !isExpanded ? DISPLAY_LIMIT : ordered.length

  if (entries.length === 0) return null

  return (
    // aria-busy because every skeleton is aria-hidden, so during the wait this region is a heading
    // with nothing under it and an assistive reader would otherwise be told it is complete. It marks
    // the region as still filling; it does not announce anything when it clears, and it is not meant
    // to — that would need a live region, and a rail that speaks on every load is worse than one a
    // reader can come back to.
    <section aria-busy={!isRevealed} aria-label="Choosees in progress" className="flex flex-col gap-2.5">
      <ListHeading />
      {ordered.map((entry, index) => (
        <Card
          entry={entry}
          isHidden={index >= visibleCount}
          isRevealed={isRevealed}
          key={entry.sessionId}
          onDismiss={onDismiss}
          onGone={onGone}
          onState={onState}
        />
      ))}
      {/* Not tappable until the cards are — it would be the one live target on a list that is
          deliberately inert until it is final — but its space is held from the first frame. On
          mobile the columns stack hero → cards → form, so a control that appears at reveal pushes
          the create card and its text input down by its own height plus the gap, which is the same
          shift the skeletons exist to prevent, moved one row lower.

          The count is honest this early: while waiting, `ordered` is `entries`, so how many the cap
          is hiding is known synchronously from storage. */}
      {hidden > 0 &&
        (isRevealed ? (
          <ShowMore hidden={hidden} isExpanded={isExpanded} onPress={() => setIsExpanded((current) => !current)} />
        ) : (
          <ShowMorePlaceholder />
        ))}
    </section>
  )
}

export default ActiveSessions
