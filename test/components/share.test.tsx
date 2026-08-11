import { toast } from '@heroui/react'
import React from 'react'

import Share from '@components/share'
import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('@heroui/react', () => ({
  ...jest.requireActual('@heroui/react'),
  toast: Object.assign(jest.fn(), { danger: jest.fn(), info: jest.fn(), success: jest.fn(), warning: jest.fn() }),
}))

const sessionId = 'test-session'
const shareMock = jest.fn()

function ensureNoShare(): void {
  Reflect.deleteProperty(navigator, 'share')
}

function enableShare(): void {
  Object.defineProperty(navigator, 'share', { configurable: true, value: shareMock, writable: true })
  shareMock.mockResolvedValue(undefined)
}

function setup({ withShare = false }: { withShare?: boolean } = {}): ReturnType<typeof userEvent.setup> {
  if (withShare) {
    enableShare()
  } else {
    ensureNoShare()
  }
  const user = userEvent.setup()
  render(<Share sessionId={sessionId} />)
  return user
}

describe('Share', () => {
  it('should render copy and QR buttons and no share button when Web Share is unavailable', async () => {
    setup()
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show code and QR' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument()
  })

  it('should render the copy and QR buttons in the bare variant', async () => {
    ensureNoShare()
    render(<Share sessionId={sessionId} variant="bare" />)
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show code and QR' })).toBeInTheDocument()
  })

  it('should render the share button when Web Share is available', async () => {
    setup({ withShare: true })
    expect(await screen.findByRole('button', { name: 'Share' })).toBeInTheDocument()
  })

  it('should call navigator.share with the session URL', async () => {
    const user = setup({ withShare: true })
    const shareButton = await screen.findByRole('button', { name: 'Share' })
    await user.click(shareButton)
    expect(shareMock).toHaveBeenCalledWith(expect.objectContaining({ url: expect.stringContaining(`/s/${sessionId}`) }))
  })

  it('should not surface an error when the share sheet is canceled', async () => {
    const user = setup({ withShare: true })
    shareMock.mockRejectedValueOnce(new Error('AbortError'))
    const shareButton = await screen.findByRole('button', { name: 'Share' })
    await user.click(shareButton)
    expect(shareMock).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument()
  })

  it('should copy the session URL and show the copied state', async () => {
    const user = setup()
    const writeText = jest.spyOn(navigator.clipboard, 'writeText')
    await user.click(screen.getByRole('button', { name: 'Copy link' }))
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining(`/s/${sessionId}`))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Link copied' })).toBeInTheDocument())
  })

  it('should open the QR modal without a copy URL option', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Show code and QR' }))
    await waitFor(() => expect(screen.getByText('Two ways in')).toBeInTheDocument())
    expect(screen.getByText(new RegExp(`/s/${sessionId}`))).toBeInTheDocument()
    expect(screen.queryByText('Copy URL')).not.toBeInTheDocument()
  })

  it('should show a toast and stay in the copy state when the clipboard write fails', async () => {
    const user = setup()
    jest.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('Permission denied'))
    await user.click(screen.getByRole('button', { name: 'Copy link' }))
    await waitFor(() => expect(toast.danger).toHaveBeenCalledWith("Couldn't copy the link. Use the QR code instead."))
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument()
  })

  describe('the code, for reading out', () => {
    // AC-026. Every share affordance emitted a URL and nothing else, so the identifier existed only
    // as a path segment inside a link that nobody reads.
    it('shows the identifier as words in the QR modal', async () => {
      const user = setup()

      await user.click(screen.getByRole('button', { name: 'Show code and QR' }))

      await waitFor(() => expect(screen.getByText('test session')).toBeInTheDocument())
    })

    // AC-027. What the inviter reads aloud has to be what the invitee can type, or the two halves
    // of this feature drift apart in separate commits.
    it('copies the spoken form rather than the URL', async () => {
      const writeText = jest.fn().mockResolvedValue(undefined)
      const user = setup()
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
      await user.click(screen.getByRole('button', { name: 'Show code and QR' }))

      await user.click(await screen.findByRole('button', { name: 'Copy code' }))

      expect(writeText).toHaveBeenCalledWith('test session')
    })

    it('confirms the code was copied', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: jest.fn().mockResolvedValue(undefined) },
      })
      const user = setup()
      await user.click(screen.getByRole('button', { name: 'Show code and QR' }))

      await user.click(await screen.findByRole('button', { name: 'Copy code' }))

      expect(await screen.findByRole('button', { name: 'Code copied' })).toBeInTheDocument()
    })

    it('falls back to reading it out when the clipboard refuses', async () => {
      const user = setup()
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: jest.fn().mockRejectedValue(new Error('denied')) },
      })
      await user.click(screen.getByRole('button', { name: 'Show code and QR' }))

      await user.click(await screen.findByRole('button', { name: 'Copy code' }))

      await waitFor(() => expect(toast.danger).toHaveBeenCalledWith("Couldn't copy the code. Read it out instead."))
    })

    // AC-028. navigator.share sends text and url separately, so this sentence never contains the
    // link -- hence naming the condition the code matters under rather than offering an alternative.
    it('sends the code in the shared message', async () => {
      const user = setup({ withShare: true })

      await user.click(await screen.findByRole('button', { name: 'Share' }))

      expect(shareMock).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Help me pick a place to eat. If the link won\'t open, enter the code "test session" in Choosee.',
        }),
      )
    })
  })
})
