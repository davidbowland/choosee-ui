import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

import UserSelectPhase from '@components/session/user-select'
import * as api from '@services/api'
import { apiError } from '@test/__mocks__'
import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { User } from '@types'

jest.mock('@services/api', () => ({
  ...jest.requireActual('@services/api'),
  createUser: jest.fn(),
}))

const mockUsers: User[] = [
  { userId: 'brave-tiger', name: null, votes: [[null]] },
  { userId: 'user-2', name: 'Alice', votes: [[null]] },
]

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('UserSelectPhase', () => {
  const onUserSelected = jest.fn()

  it('should display user list with display names', () => {
    renderWithClient(<UserSelectPhase onUserSelected={onUserSelected} sessionId="s1" users={mockUsers} />)
    expect(screen.getByText('brave tiger')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it("should show 'I'm new' option", () => {
    renderWithClient(<UserSelectPhase onUserSelected={onUserSelected} sessionId="s1" users={mockUsers} />)
    expect(screen.getByText("I'm new")).toBeInTheDocument()
  })

  it('should call onUserSelected when selecting existing user and confirming', async () => {
    const user = userEvent.setup()
    renderWithClient(<UserSelectPhase onUserSelected={onUserSelected} sessionId="s1" users={mockUsers} />)
    await user.click(screen.getByText('Alice'))
    await user.click(screen.getByText(/Let's go/i))
    expect(onUserSelected).toHaveBeenCalledWith('user-2')
  })

  it('should auto-create user when user list is empty', async () => {
    const newUser: User = {
      userId: 'new-user',
      name: null,
      votes: [],
    }
    jest.mocked(api.createUser).mockResolvedValue(newUser)

    renderWithClient(<UserSelectPhase onUserSelected={onUserSelected} sessionId="s1" users={[]} />)

    await waitFor(() => {
      expect(api.createUser).toHaveBeenCalledWith('s1')
    })
    await waitFor(() => {
      expect(onUserSelected).toHaveBeenCalledWith('new-user')
    })
  })

  it('should only call createUser once even on re-render', async () => {
    const newUser: User = {
      userId: 'new-user',
      name: null,
      votes: [],
    }
    jest.mocked(api.createUser).mockResolvedValue(newUser)

    const { rerender } = renderWithClient(<UserSelectPhase onUserSelected={onUserSelected} sessionId="s1" users={[]} />)

    rerender(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } })}
      >
        <UserSelectPhase onUserSelected={onUserSelected} sessionId="s1" users={[]} />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(api.createUser).toHaveBeenCalledTimes(1)
    })
  })

  it('should show error when create user returns 400', async () => {
    jest.mocked(api.createUser).mockRejectedValue(apiError(400, JSON.stringify({ message: 'Max players reached' })))

    const user = userEvent.setup()
    renderWithClient(<UserSelectPhase onUserSelected={onUserSelected} sessionId="s1" users={mockUsers} />)

    await user.click(screen.getByText("I'm new"))
    await user.click(screen.getByText(/Let's go/i))

    expect(await screen.findByText(/Max players reached/i)).toBeInTheDocument()
  })

  it('should show invite section with copy and QR actions', () => {
    renderWithClient(<UserSelectPhase onUserSelected={onUserSelected} sessionId="s1" users={mockUsers} />)
    expect(screen.getByText(/Invite someone/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show code and QR' })).toBeInTheDocument()
  })

  it('should copy invite link to clipboard', async () => {
    const user = userEvent.setup()
    renderWithClient(<UserSelectPhase onUserSelected={onUserSelected} sessionId="s1" users={mockUsers} />)
    const writeTextSpy = jest.spyOn(navigator.clipboard, 'writeText')
    await user.click(screen.getByRole('button', { name: 'Copy link' }))
    expect(writeTextSpy).toHaveBeenCalledWith(expect.stringContaining('/s/s1'))
    writeTextSpy.mockRestore()
  })

  it('should show the QR code in a modal', async () => {
    const user = userEvent.setup()
    renderWithClient(<UserSelectPhase onUserSelected={onUserSelected} sessionId="s1" users={mockUsers} />)
    expect(screen.queryByText('Two ways in')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show code and QR' }))
    await waitFor(() => expect(screen.getByText('Two ways in')).toBeInTheDocument())
  })

  it('should show generic error when createUser fails with non-400', async () => {
    jest.mocked(api.createUser).mockRejectedValue(new Error('Network error'))

    const user = userEvent.setup()
    renderWithClient(<UserSelectPhase onUserSelected={onUserSelected} sessionId="s1" users={mockUsers} />)

    await user.click(screen.getByText("I'm new"))
    await user.click(screen.getByText(/Let's go/i))

    expect(await screen.findByText(/Couldn't join/i)).toBeInTheDocument()
  })
})
