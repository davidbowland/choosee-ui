import React from 'react'

import AppBar from '@components/app-bar'
import { InstallPromptContext } from '@hooks/useInstallPrompt'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('AppBar', () => {
  const mockPromptInstall = jest.fn()
  const installLabel = 'Add Choosee to your Home Screen'

  // jsdom is neither iOS nor Firefox for Android, so a captured prompt is the only thing that makes
  // resolveInstallMethod offer anything here.
  const renderWithCapturedPrompt = (): void => {
    render(
      <InstallPromptContext.Provider value={{ hasInstallPrompt: true, promptInstall: mockPromptInstall }}>
        <AppBar />
      </InstallPromptContext.Provider>,
    )
  }

  beforeAll(() => {
    mockPromptInstall.mockResolvedValue(undefined)
  })

  it('should render the Choosee branding', () => {
    render(<AppBar />)
    expect(screen.getByText('Choosee')).toBeInTheDocument()
  })

  it('should link to the home page', () => {
    render(<AppBar />)
    expect(screen.getByRole('link', { name: 'Choosee' })).toHaveAttribute('href', '/')
  })

  it('should render a nav element', () => {
    render(<AppBar />)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('should not offer install when the browser cannot install', () => {
    render(<AppBar />)
    expect(screen.queryByRole('button', { name: installLabel })).not.toBeInTheDocument()
  })

  it('should offer install once the browser has captured a prompt', () => {
    renderWithCapturedPrompt()
    expect(screen.getByRole('button', { name: installLabel })).toBeInTheDocument()
  })

  it('should open the install dialog', async () => {
    renderWithCapturedPrompt()
    await userEvent.click(screen.getByRole('button', { name: installLabel }))
    expect(screen.getByText('Put Choosee on your Home Screen')).toBeInTheDocument()
  })

  it('should replay the captured prompt from the dialog', async () => {
    renderWithCapturedPrompt()
    await userEvent.click(screen.getByRole('button', { name: installLabel }))
    await userEvent.click(screen.getByRole('button', { name: 'Add to Home Screen' }))
    expect(mockPromptInstall).toHaveBeenCalledTimes(1)
  })

  it('should close the install dialog on Not now', async () => {
    renderWithCapturedPrompt()
    await userEvent.click(screen.getByRole('button', { name: installLabel }))
    await userEvent.click(screen.getByRole('button', { name: 'Not now' }))
    expect(screen.queryByText('Put Choosee on your Home Screen')).not.toBeInTheDocument()
  })
})
