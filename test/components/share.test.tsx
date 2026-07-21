import React from 'react'

import Share from '@components/share'
import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

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
    expect(screen.getByRole('button', { name: 'Show QR code' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument()
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

  it('should not surface an error when the share sheet is cancelled', async () => {
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
    await user.click(screen.getByRole('button', { name: 'Show QR code' }))
    await waitFor(() => expect(screen.getByText('Scan to join')).toBeInTheDocument())
    expect(screen.getByText(new RegExp(`/s/${sessionId}`))).toBeInTheDocument()
    expect(screen.queryByText('Copy URL')).not.toBeInTheDocument()
  })

  it('should silently ignore a clipboard failure', async () => {
    const user = setup()
    jest.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('Permission denied'))
    await user.click(screen.getByRole('button', { name: 'Copy link' }))
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument()
  })
})
