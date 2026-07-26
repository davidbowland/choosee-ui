import { toast } from '@heroui/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import React, { useEffect, useRef, useState } from 'react'

import { firstUnvotedIndex } from '../helpers'
import {
  ActionRow,
  BracketButton,
  MatchupContainer,
  SegmentDivider,
  SegmentedActions,
  TournamentHeader,
  VoteCallToAction,
  VotingContainer,
  VsLabel,
} from './elements'
import { useAuthContext } from '@components/auth-context'
import BracketView from '@components/bracket-view'
import RestaurantCard from '@components/restaurant-card'
import { FilterClosingSoonBadge, SoloVoterHint } from '@components/session/elements'
import Share from '@components/share'
import { patchUser, hasErrorCode, hasStatusCode } from '@services/api'
import { ChoicesMap, ErrorCode, SessionData, User } from '@types'
import { displayName, isSoloVoter } from '@utils/users'

const VOTE_ACCEPT_DELAY_MS = 300 // Time green check shows

// A 409 means the write lost a race against a concurrent update of the same record, not that
// anything is broken — hence `info`, not `danger`. The action itself is still valid, so the
// copy asks for the same gesture again once the refreshed data has landed.
// Pinned here so the conflict paths cannot be quietly conflated with the permanent
// ROUND_NOT_CURRENT path, which must keep its own copy.
// Not "someone else voted": the vote is on your OWN record, so the contender is the
// round-advance loop or your own second tab — no other participant writes your votes.
const VOTE_CONFLICT_MESSAGE =
  "That didn't save — the Choosee updated at the same moment. Refreshed — tap your pick again."
// Not "someone else": your name lives on your own record, so the contender is the
// round-advance loop or your own second tab. And the editor closes on commit, discarding
// what was typed, so the retry is re-opening it — not one more tap on a save button.
const NAME_CONFLICT_MESSAGE =
  "Your name didn't save — the Choosee updated at the same moment. Tap your name to try again."

export interface VotingPhaseProps {
  sessionId: string
  session: SessionData
  currentUser: User
  choices: ChoicesMap
}

const VotingPhase = ({ sessionId, session, currentUser, choices }: VotingPhaseProps): React.ReactNode => {
  const queryClient = useQueryClient()
  const { isSignedIn } = useAuthContext()
  const [bracketOpen, setBracketOpen] = useState(false)

  const currentRound = session.currentRound
  const matchups = session.bracket[currentRound] ?? []

  const [pendingVote, setPendingVote] = useState<{ idx: number; choiceId: string } | null>(null)
  const pendingVoteTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const matchupRef = useRef<HTMLDivElement>(null)
  const hasScrolled = useRef(false)

  useEffect(() => {
    return () => clearTimeout(pendingVoteTimer.current)
  }, [])

  const realMatchupIndex = firstUnvotedIndex(session, currentUser)
  const isPending = pendingVote !== null

  // While a vote result is being shown, hold on the previous matchup
  const matchupIndex = isPending ? pendingVote.idx : realMatchupIndex

  useEffect(() => {
    if (realMatchupIndex !== -1 && !isPending) {
      if (hasScrolled.current) {
        matchupRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      hasScrolled.current = true
    }
  }, [realMatchupIndex, isPending])

  if (matchupIndex === -1) return null

  const matchup = matchups[matchupIndex]
  const [choiceA, choiceB] = matchup ?? ['', '']

  const voteMutation = useMutation({
    mutationFn: ({ idx, choiceId }: { idx: number; choiceId: string }) =>
      patchUser(
        sessionId,
        currentUser.userId,
        [{ op: 'replace', path: `/votes/${currentRound}/${idx}`, value: choiceId }],
        isSignedIn,
      ),
    onMutate: async ({ idx, choiceId }) => {
      setPendingVote({ idx, choiceId })
      await queryClient.cancelQueries({ queryKey: ['users', sessionId] })
      const previous = queryClient.getQueryData<User[]>(['users', sessionId])
      queryClient.setQueryData<User[]>(['users', sessionId], (old) =>
        old?.map((u) => {
          if (u.userId !== currentUser.userId) return u
          const roundVotes = u.votes[currentRound] ?? []
          const padded = Array.from({ length: Math.max(matchups.length, roundVotes.length) }, (_, i) =>
            i === idx ? choiceId : (roundVotes[i] ?? null),
          )
          return {
            ...u,
            votes: u.votes.map((r, ri) => (ri === currentRound ? padded : r)),
          }
        }),
      )
      return { previous }
    },
    onError: async (err, _vars, context) => {
      queryClient.setQueryData(['users', sessionId], context?.previous)
      setPendingVote(null)
      // Permanent for this vote: the round genuinely advanced, so it can never apply.
      if (hasErrorCode(err, ErrorCode.ROUND_NOT_CURRENT)) {
        toast.info("That round ended before your vote landed — here's the next one.")
        void queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
        return
      }
      // Transient: the record moved under us. Deliberately no auto-retry — the optimistic
      // update is already rolled back, and retrying would re-submit against data the user
      // has not seen. Await the session refetch before toasting: the likeliest contender is
      // the round-advance loop, so an immediate re-tap against the stale round would come
      // straight back as ROUND_NOT_CURRENT and contradict this very message. Only ['session']
      // is invalidated here — onSettled already invalidates ['users'] on every path.
      if (hasStatusCode(err, 409)) {
        await queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
        toast.info(VOTE_CONFLICT_MESSAGE)
        return
      }
      toast.danger("Your vote didn't save. Tap your pick again.")
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['users', sessionId] })
      // The session query does not poll during voting, so without this the object held here
      // is as old as the moment this phase was entered — and the waiting screen renders it
      // the instant the last vote lands, showing a stale "0 of 1" and a stale solo hint until
      // the 5s waiting poll corrects them. A vote writes votersSubmitted server-side, so
      // re-reading the session after one is what makes those numbers true.
      // This must stay in onSettled: the phase flips to waiting during onMutate while the
      // PATCH is still in flight, so invalidating there would race the write and read back
      // the same stale votersSubmitted anyway.
      void queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
      clearTimeout(pendingVoteTimer.current)
      pendingVoteTimer.current = setTimeout(() => setPendingVote(null), VOTE_ACCEPT_DELAY_MS)
    },
  })

  const handleVote = (choiceId: string): void => {
    if (voteMutation.isPending || pendingVote !== null) return
    voteMutation.mutate({ idx: matchupIndex, choiceId })
  }

  const nameMutation = useMutation({
    mutationFn: (newName: string) =>
      patchUser(sessionId, currentUser.userId, [{ op: 'replace', path: '/name', value: newName }], isSignedIn),
    onMutate: async (newName) => {
      await queryClient.cancelQueries({ queryKey: ['users', sessionId] })
      const previous = queryClient.getQueryData<User[]>(['users', sessionId])
      queryClient.setQueryData<User[]>(['users', sessionId], (old) =>
        old?.map((u) => (u.userId === currentUser.userId ? { ...u, name: newName } : u)),
      )
      return { previous }
    },
    onError: (err, _vars, context) => {
      queryClient.setQueryData(['users', sessionId], context?.previous)
      // onSettled already invalidates ['users'] on every path, so no invalidation here.
      if (hasStatusCode(err, 409)) {
        toast.info(NAME_CONFLICT_MESSAGE)
        return
      }
      toast.danger("Your name didn't save. Tap your name to try again.")
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['users', sessionId] })
    },
  })

  const handleNameSave = (newName: string): void => {
    if (newName && newName !== currentUser.name) {
      nameMutation.mutate(newName)
    }
  }

  return (
    <VotingContainer>
      {isSoloVoter(session) && <SoloVoterHint />}
      {session.filterClosingSoon && <FilterClosingSoonBadge />}

      <TournamentHeader
        matchCurrent={matchupIndex + 1}
        matchTotal={matchups.length}
        onNameSave={handleNameSave}
        playerName={displayName(currentUser)}
        roundCurrent={currentRound + 1}
        roundTotal={session.totalRounds}
      />

      <VoteCallToAction />

      <MatchupContainer ref={matchupRef}>
        {(() => {
          const isBusy = voteMutation.isPending || pendingVote !== null
          const votedId =
            pendingVote?.choiceId ?? (voteMutation.isPending ? voteMutation.variables?.choiceId : undefined)
          // Only show overlays if the voted choice is one of the CURRENT matchup cards;
          // prevents both cards showing ✗ when an optimistic update advances to the next matchup
          const votedForCurrent = votedId !== undefined && (votedId === choiceA || votedId === choiceB)
          return (
            <>
              <RestaurantCard
                choice={choices[choiceA] ?? { choiceId: choiceA, name: choiceA, photos: [] }}
                disabled={isBusy}
                key={choiceA}
                onClick={() => handleVote(choiceA)}
                selected={votedForCurrent ? votedId === choiceA : undefined}
                variant="voting"
              />
              <VsLabel />
              <RestaurantCard
                choice={choices[choiceB] ?? { choiceId: choiceB, name: choiceB, photos: [] }}
                disabled={isBusy}
                key={choiceB}
                onClick={() => handleVote(choiceB)}
                selected={votedForCurrent ? votedId === choiceB : undefined}
                variant="voting"
              />
            </>
          )
        })()}
      </MatchupContainer>

      <ActionRow>
        <SegmentedActions>
          <BracketButton onPress={() => setBracketOpen(true)} />
          <SegmentDivider />
          <Share sessionId={sessionId} variant="bare" />
        </SegmentedActions>
      </ActionRow>

      <BracketView choices={choices} onClose={() => setBracketOpen(false)} open={bracketOpen} session={session} />
    </VotingContainer>
  )
}

export default VotingPhase
