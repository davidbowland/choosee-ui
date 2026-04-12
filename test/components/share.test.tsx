import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

import Share from '@components/share'
import { shareSession } from '@services/api'

jest.mock('@services/api')

const mockShareSession = jest.mocked(shareSession)

const PHONE_PLACEHOLDER = '+1 (555) 123-4567'

describe('Share', () => {
  const sessionId = 'test-session'
  const userId = 'test-user'

  async function renderWithModalOpen() {
    const user = userEvent.setup()
    render(<Share sessionId={sessionId} userId={userId} />)
    await user.click(screen.getByText('Share'))
    return user
  }

  it('should render the copy URL button', async () => {
    await renderWithModalOpen()
    expect(screen.getByText('Copy URL')).toBeInTheDocument()
  })

  it('should copy URL to clipboard when copy button is pressed', async () => {
    const user = userEvent.setup()
    render(<Share sessionId={sessionId} userId={userId} />)
    const writeTextSpy = jest.spyOn(navigator.clipboard, 'writeText')
    await user.click(screen.getByText('Share'))
    await user.click(screen.getByText('Copy URL'))
    expect(writeTextSpy).toHaveBeenCalledWith(expect.stringContaining(`/s/${sessionId}`))
    writeTextSpy.mockRestore()
  })

  it('should render a QR code', async () => {
    const user = userEvent.setup()
    const { container } = render(<Share sessionId={sessionId} userId={userId} />)
    await user.click(screen.getByText('Share'))
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('should render phone input and send button', async () => {
    await renderWithModalOpen()
    expect(screen.getByPlaceholderText(PHONE_PLACEHOLDER)).toBeInTheDocument()
    expect(screen.getByText('Send invite')).toBeInTheDocument()
  })

  it('should call shareSession on send invite', async () => {
    mockShareSession.mockResolvedValueOnce({ userId })
    const user = await renderWithModalOpen()

    const input = screen.getByPlaceholderText(PHONE_PLACEHOLDER)
    await user.type(input, '2125551234')

    await user.click(screen.getByText('Send invite'))

    expect(mockShareSession).toHaveBeenCalledWith(sessionId, userId, '+12125551234')
    await waitFor(() => {
      expect(screen.getByText('Invite sent')).toBeInTheDocument()
    })
  })

  it('should show rate limit error on 429', async () => {
    mockShareSession.mockRejectedValueOnce({ response: { status: 429 } })
    const user = await renderWithModalOpen()

    const input = screen.getByPlaceholderText(PHONE_PLACEHOLDER)
    await user.type(input, '2125551234')
    await user.click(screen.getByText('Send invite'))

    await waitFor(() => {
      expect(screen.getByText('Rate limit reached. Please try again later.')).toBeInTheDocument()
    })
  })

  it('should show error when clipboard write fails', async () => {
    // Override writeText after userEvent.setup() installs its clipboard
    const user = userEvent.setup()
    render(<Share sessionId={sessionId} userId={userId} />)
    await user.click(screen.getByText('Share'))
    jest.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('Permission denied'))
    await user.click(screen.getByText('Copy URL'))
    await waitFor(() => {
      expect(screen.getByText('Failed to copy URL to clipboard.')).toBeInTheDocument()
    })
  })

  it('should show generic error on non-429 failure', async () => {
    mockShareSession.mockRejectedValueOnce(new Error('Network error'))
    const user = await renderWithModalOpen()

    const input = screen.getByPlaceholderText(PHONE_PLACEHOLDER)
    await user.type(input, '2125551234')
    await user.click(screen.getByText('Send invite'))

    await waitFor(() => {
      expect(screen.getByText('Failed to send invite. Please try again.')).toBeInTheDocument()
    })
  })

  it('should not send when phone is empty', async () => {
    await renderWithModalOpen()
    // Send invite button should be disabled when phone is empty
    const sendBtn = screen.getByText('Send invite')
    expect(sendBtn).toBeDisabled()
  })
})
