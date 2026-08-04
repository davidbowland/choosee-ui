import React from 'react'

import InstallDialog from './index'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InstallMethod } from '@utils/push-capability'

describe('InstallDialog', () => {
  const mockPromptInstall = jest.fn()
  const mockClose = jest.fn()

  const renderDialog = (method: InstallMethod): void => {
    render(<InstallDialog method={method} onClose={mockClose} open promptInstall={mockPromptInstall} />)
  }

  beforeAll(() => {
    mockPromptInstall.mockResolvedValue(undefined)
  })

  it.each<InstallMethod>(['prompt', 'ios-share', 'browser-menu'])('should state the offer on %s', (method) => {
    renderDialog(method)

    expect(screen.getByText('Put Choosee on your Home Screen')).toBeInTheDocument()
    expect(screen.getByText('Opens like an app, straight to a full screen.')).toBeInTheDocument()
  })

  it('should claim exclusivity on iOS, where it is true', () => {
    renderDialog('ios-share')

    expect(screen.getByText("It's the only way to get notified when a round opens.")).toBeInTheDocument()
  })

  // The load-bearing test in this file. Chrome and Firefox for Android both deliver push to an
  // ordinary tab with nothing installed, so this sentence anywhere but iOS is a plain lie.
  it.each<InstallMethod>(['prompt', 'browser-menu'])('should not claim exclusivity on %s', (method) => {
    renderDialog(method)

    expect(screen.queryByText("It's the only way to get notified when a round opens.")).not.toBeInTheDocument()
  })

  it('should replay the captured browser prompt', async () => {
    renderDialog('prompt')
    await userEvent.click(screen.getByRole('button', { name: 'Add to Home Screen' }))

    expect(mockPromptInstall).toHaveBeenCalledTimes(1)
  })

  it('should close once the browser has taken over the install', async () => {
    renderDialog('prompt')
    await userEvent.click(screen.getByRole('button', { name: 'Add to Home Screen' }))

    expect(mockClose).toHaveBeenCalledTimes(1)
  })

  it('should give iOS the Share gesture', () => {
    renderDialog('ios-share')

    expect(screen.getByText(/Share/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add to Home Screen' })).not.toBeInTheDocument()
  })

  it('should send browser-menu users to their menu, not to a Share button that does not exist', () => {
    renderDialog('browser-menu')

    expect(screen.getByText(/Add to Home screen/)).toBeInTheDocument()
    expect(screen.queryByText(/Share/)).not.toBeInTheDocument()
  })

  it('should close on Not now', async () => {
    renderDialog('prompt')
    await userEvent.click(screen.getByRole('button', { name: 'Not now' }))

    expect(mockClose).toHaveBeenCalledTimes(1)
  })

  it('should close on Escape', async () => {
    renderDialog('prompt')
    await userEvent.keyboard('{Escape}')

    expect(mockClose).toHaveBeenCalledTimes(1)
  })

  it('should render nothing until it is opened', () => {
    render(<InstallDialog method="prompt" onClose={mockClose} open={false} promptInstall={mockPromptInstall} />)

    expect(screen.queryByText('Put Choosee on your Home Screen')).not.toBeInTheDocument()
  })
})
