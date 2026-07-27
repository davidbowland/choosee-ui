import React from 'react'

import LoadingPhase from '@components/session/loading'
import { LoadingSpinner, shuffle } from '@components/session/loading/elements'
import '@testing-library/jest-dom'
import { act, render, screen } from '@testing-library/react'
import { SessionData } from '@types'

const baseSession: SessionData = {
  sessionId: 'test-session',
  address: '123 Main St',
  location: { latitude: 0, longitude: 0 },
  currentRound: 0,
  totalRounds: 3,
  bracket: [[['a', 'b']]],
  byes: [null],
  isReady: false,
  errorMessage: null,
  filterClosingSoon: false,
  users: [],
  winner: null,
  type: ['restaurant'],
  exclude: [],
  radius: 5000,
  rankBy: 'DISTANCE',
  voterCount: 2,
  votersSubmitted: 0,
}

const NOW = 1_700_000_000_000
const now = () => NOW

describe('LoadingPhase', () => {
  it('should render the spinner when there is no error or timeout', () => {
    render(<LoadingPhase now={now} session={baseSession} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('should render the spinner when session is undefined', () => {
    render(<LoadingPhase now={now} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('should render error message with link home when errorMessage is set', () => {
    render(<LoadingPhase now={now} session={{ ...baseSession, errorMessage: 'Server exploded' }} />)
    expect(screen.getByText(/Server exploded/i)).toBeInTheDocument()
    expect(screen.getByText(/Go home/i)).toHaveAttribute('href', '/')
  })

  it('should render timeout message when timeoutAt is in the past', () => {
    render(<LoadingPhase now={now} session={{ ...baseSession, timeoutAt: NOW - 1_000 }} />)
    expect(screen.getByText(/Setup timed out/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Try again/i })).toHaveAttribute('href', '/')
  })

  it('should render the spinner when timeoutAt is in the future', () => {
    render(<LoadingPhase now={now} session={{ ...baseSession, timeoutAt: NOW + 60_000 }} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})

describe('shuffle', () => {
  it('should leave the order untouched when random always picks the last index', () => {
    expect(shuffle(['a', 'b', 'c'], () => 0.999)).toEqual(['a', 'b', 'c'])
  })

  it('should rotate the order when random always picks the first index', () => {
    // i=2 swaps a/c -> [c,b,a]; i=1 swaps c/b -> [b,c,a]
    expect(shuffle(['a', 'b', 'c'], () => 0)).toEqual(['b', 'c', 'a'])
  })

  it('should not mutate the input array', () => {
    const input = ['a', 'b', 'c']
    shuffle(input, () => 0)
    expect(input).toEqual(['a', 'b', 'c'])
  })
})

describe('LoadingSpinner', () => {
  beforeAll(() => {
    jest.useFakeTimers()
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  // random -> 0.999 keeps LOADING_MESSAGES in its declared order, so the cycle is predictable.
  const identityShuffle = () => 0.999

  it('should render the first message on mount', () => {
    render(<LoadingSpinner random={identityShuffle} />)
    expect(screen.getByRole('status')).toHaveTextContent('Scouting the competition...')
  })

  it('should advance to the next message after the cycle interval', () => {
    render(<LoadingSpinner random={identityShuffle} />)

    act(() => {
      jest.advanceTimersByTime(2_200)
    })

    expect(screen.getByRole('status')).toHaveTextContent('Lining up the challengers...')
  })

  it('should wrap back to the first message after the last one', () => {
    render(<LoadingSpinner random={identityShuffle} />)

    act(() => {
      jest.advanceTimersByTime(2_200 * 10)
    })

    expect(screen.getByRole('status')).toHaveTextContent('Scouting the competition...')
  })
})
