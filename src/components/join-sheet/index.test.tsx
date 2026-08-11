import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

import JoinSheet from './index'
import * as api from '@services/api'
import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionData } from '@types'
import * as joinedSessions from '@utils/joined-sessions'

jest.mock('@services/api')
jest.mock('@utils/joined-sessions')

const mockPush = jest.fn()
jest.mock('next/router', () => ({ useRouter: () => ({ push: mockPush }) }))

const mockedApi = api as jest.Mocked<typeof api>
const mockedStore = joinedSessions as jest.Mocked<typeof joinedSessions>

const session = { sessionId: 'lazy-giraffe' } as SessionData

const apiError = (statusCode: number): Error => Object.assign(new Error('nope'), { body: '{}', statusCode })

describe('JoinSheet', () => {
  beforeAll(() => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true, writable: true })
  })

  const setup = (props: Partial<React.ComponentProps<typeof JoinSheet>> = {}) => {
    mockedApi.fetchSession.mockResolvedValue(session)
    mockedApi.hasStatusCode.mockImplementation((err, code) => (err as { statusCode?: number })?.statusCode === code)
    mockedStore.findJoinedSession.mockReturnValue(undefined)
    mockPush.mockResolvedValue(true)
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
        <JoinSheet isOpen={true} onClose={jest.fn()} {...props} />
      </QueryClientProvider>,
    )
    return user
  }

  const field = (): HTMLElement => screen.getByLabelText('Code or link')

  describe('resolving an identifier', () => {
    it('navigates to the Choosee for a typed code', async () => {
      const user = setup()

      await user.type(field(), 'lazy giraffe')
      await user.click(screen.getByRole('button', { name: /Let's go/ }))

      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/s/lazy-giraffe'))
    })

    // AC-006. The whole point for a user whose browser won't open the link: they can still copy it.
    it('navigates to the Choosee for a pasted link', async () => {
      const user = setup()

      await user.type(field(), 'https://choosee.dbowland.com/s/lazy-giraffe')
      await user.click(screen.getByRole('button', { name: /Let's go/ }))

      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/s/lazy-giraffe'))
    })

    // AC-017 / AC-033: the form must be completable without a pointer.
    it('submits from the field with Enter', async () => {
      const user = setup()

      await user.type(field(), 'lazy giraffe{Enter}')

      await waitFor(() => expect(mockedApi.fetchSession).toHaveBeenCalledWith('lazy-giraffe'))
    })
  })

  describe('refusing input without a request', () => {
    // AC-008 / AC-011.
    it('refuses an empty submit and issues no lookup', async () => {
      const user = setup()

      await user.click(screen.getByRole('button', { name: /Let's go/ }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Enter the code, or paste the link.')
      expect(mockedApi.fetchSession).not.toHaveBeenCalled()
    })

    it('refuses input with no identifier in it and issues no lookup', async () => {
      const user = setup()

      await user.type(field(), '../etc/passwd')
      await user.click(screen.getByRole('button', { name: /Let's go/ }))

      expect(await screen.findByRole('alert')).toHaveTextContent("That doesn't have a Choosee in it.")
      expect(mockedApi.fetchSession).not.toHaveBeenCalled()
    })

    // AC-011: typing is not a lookup.
    it('issues no lookup while the user is typing', async () => {
      const user = setup()

      await user.type(field(), 'lazy giraffe')

      expect(mockedApi.fetchSession).not.toHaveBeenCalled()
    })
  })

  describe('when the identifier does not resolve', () => {
    // AC-010: correctable in place. AC-012: the note prints unconditionally, so a failure never
    // reveals whether the Choosee expired or never existed.
    it('keeps the value, explains, and offers both exits', async () => {
      const user = setup()
      mockedApi.fetchSession.mockRejectedValueOnce(apiError(404))

      await user.type(field(), 'lazy giraffee{Enter}')

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('Check the words, or ask for a new one.')
      expect(alert).toHaveTextContent('Choosees only last 24 hours.')
      expect(field()).toHaveValue('lazy giraffee')
    })

    // AC-032.
    it('returns focus to the field so retrying is one gesture', async () => {
      const user = setup()
      mockedApi.fetchSession.mockRejectedValueOnce(apiError(404))

      await user.type(field(), 'lazy giraffee{Enter}')

      await waitFor(() => expect(field()).toHaveFocus())
    })

    // AC-016: the error is associated with the field, not merely adjacent to it.
    it('marks the field invalid and describes it by the error', async () => {
      const user = setup()
      mockedApi.fetchSession.mockRejectedValueOnce(apiError(404))

      await user.type(field(), 'lazy giraffee{Enter}')

      await waitFor(() => expect(field()).toHaveAttribute('aria-invalid', 'true'))
      expect(field().getAttribute('aria-describedby')).toContain('join-error')
    })

    it('relabels the submit so the next press reads as a retry', async () => {
      const user = setup()
      mockedApi.fetchSession.mockRejectedValueOnce(apiError(404))

      await user.type(field(), 'lazy giraffee{Enter}')

      expect(await screen.findByRole('button', { name: /Try again/ })).toBeInTheDocument()
    })

    it('distinguishes a lookup that failed from one that found nothing', async () => {
      const user = setup()
      mockedApi.fetchSession.mockRejectedValueOnce(apiError(500))

      await user.type(field(), 'lazy giraffe{Enter}')

      expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't check that just now.")
    })

    // The mutation runs with networkMode 'always' precisely so this errors instead of pausing
    // forever and then firing after the user has already retried.
    it('says so when the device is offline', async () => {
      const user = setup()
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: false, writable: true })
      mockedApi.fetchSession.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      await user.type(field(), 'lazy giraffe{Enter}')

      expect(await screen.findByRole('alert')).toHaveTextContent("while you're offline")
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: true, writable: true })
    })
  })

  describe('a Choosee this device already joined', () => {
    // AC-011 exceeded: zero lookups, because the answer is already on the device.
    it('offers to resume rather than joining a second time', async () => {
      const user = setup()
      mockedStore.findJoinedSession.mockReturnValue({ sessionId: 'lazy-giraffe' } as joinedSessions.JoinedSession)

      await user.type(field(), 'lazy giraffe{Enter}')

      expect(await screen.findByText("You're already in this one.")).toBeInTheDocument()
      expect(mockedApi.fetchSession).not.toHaveBeenCalled()
    })

    it('resumes into the Choosee', async () => {
      const user = setup()
      mockedStore.findJoinedSession.mockReturnValue({ sessionId: 'lazy-giraffe' } as joinedSessions.JoinedSession)
      await user.type(field(), 'lazy giraffe{Enter}')

      await user.click(await screen.findByRole('button', { name: /Pick back up/ }))

      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/s/lazy-giraffe'))
    })

    // Without this the state is a one-way door.
    it('can get back to the field', async () => {
      const user = setup()
      mockedStore.findJoinedSession.mockReturnValue({ sessionId: 'lazy-giraffe' } as joinedSessions.JoinedSession)
      await user.type(field(), 'lazy giraffe{Enter}')

      await user.click(await screen.findByRole('button', { name: 'Try a different code' }))

      expect(field()).toBeInTheDocument()
    })

    // The guard. forgetSession never fires from the session page, so a device can hold a record for
    // a Choosee the server dropped — and the shortcut would hand the user straight back to the error
    // screen they are trying to escape, permanently.
    it('does not short-circuit the code whose load just failed', async () => {
      const user = setup({ blockedCode: 'lazy-giraffe' })
      mockedStore.findJoinedSession.mockReturnValue({ sessionId: 'lazy-giraffe' } as joinedSessions.JoinedSession)

      await user.type(field(), 'lazy giraffe{Enter}')

      await waitFor(() => expect(mockedApi.fetchSession).toHaveBeenCalledWith('lazy-giraffe'))
      expect(screen.queryByText("You're already in this one.")).not.toBeInTheDocument()
    })
  })

  describe('opening with a prefill', () => {
    it('selects the prefilled value so retyping replaces it', async () => {
      setup({ initialValue: 'lazy-giraffee' })

      await waitFor(() => expect(field()).toHaveFocus())
      expect(field()).toHaveValue('lazy-giraffee')
    })
  })

  describe('paste confirmation', () => {
    it('shows what it read out of a pasted link', async () => {
      const user = setup()

      await user.type(field(), 'https://choosee.dbowland.com/s/lazy-giraffe')

      expect(await screen.findByRole('status')).toHaveTextContent('Going with lazy giraffe')
    })

    it('leaves the hint alone for a plainly typed code', async () => {
      const user = setup()

      await user.type(field(), 'lazy giraffe')

      expect(screen.getByRole('status')).toHaveTextContent('Two words, like brave otter.')
    })
  })

  describe('when the navigation itself fails', () => {
    // The success path still has a failure mode. Without this the sheet sits on
    // "Found it — taking you there…" forever, having promised something that never happened.
    it('comes back to the field rather than hanging on the success state', async () => {
      const user = setup()
      mockPush.mockRejectedValueOnce(new Error('route cancelled'))

      await user.type(field(), 'lazy giraffe{Enter}')

      expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't open that one. Try again.")
      expect(field()).toBeInTheDocument()
    })
  })
})
