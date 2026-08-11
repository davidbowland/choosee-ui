import React from 'react'

import AppBar from '@components/app-bar'
import JoinSheet from '@components/join-sheet'
import { JoinRecoveryButton } from '@components/join-sheet/elements'
import NotFound from '@pages/404'
import '@testing-library/jest-dom'
import { act, render, screen, waitFor } from '@testing-library/react'

jest.mock('@components/app-bar')
jest.mock('@components/join-sheet')
jest.mock('@components/join-sheet/elements', () => ({ JoinRecoveryButton: jest.fn() }))

describe('404 error page', () => {
  beforeAll(() => {
    jest.mocked(AppBar).mockReturnValue(<nav data-testid="app-bar" />)
    jest.mocked(JoinSheet).mockReturnValue(<></>)
    jest.mocked(JoinRecoveryButton).mockReturnValue(<>JoinRecoveryButton</>)
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { pathname: '' },
    })
  })

  /** Points the page at `pathname`; the 404 body is suppressed under /s/<id>. */
  const setup = (pathname = '/an-invalid-page'): void => {
    window.location.pathname = pathname
  }

  it('should render AppBar for non-session paths', async () => {
    setup()
    await act(async () => {
      render(<NotFound />)
    })
    await waitFor(() => expect(AppBar).toHaveBeenCalled())
  })

  it('should render heading', async () => {
    setup()
    await act(async () => {
      render(<NotFound />)
    })
    await waitFor(() => expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument())
  })

  it('should render error message', async () => {
    setup()
    await act(async () => {
      render(<NotFound />)
    })
    expect(await screen.findByText(/expired|mistyped/i)).toBeInTheDocument()
  })

  it('should not render error content when path begins /s/', async () => {
    setup('/s/aeiou')
    await act(async () => {
      render(<NotFound />)
    })
    expect(screen.queryByText(/expired|mistyped/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(AppBar).not.toHaveBeenCalled()
  })

  it('should render when pathname has three slashes', async () => {
    setup('/s/aeiou/y')
    await act(async () => {
      render(<NotFound />)
    })
    await waitFor(() => expect(screen.getByText(/expired|mistyped/i)).toBeInTheDocument())
  })

  it('should render a link to home', async () => {
    setup()
    await act(async () => {
      render(<NotFound />)
    })
    await waitFor(() => expect(screen.getByRole('link', { name: /go home/i })).toHaveAttribute('href', '/'))
  })

  // AC-029's sibling case. This page told the user their link may have been mistyped and then
  // offered them nothing but the door.
  it('should offer a way to enter a code instead of dead-ending', () => {
    setup()
    render(<NotFound />)
    expect(JoinRecoveryButton).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Enter a Choosee code' }),
      undefined,
    )
  })

  it('should not prefill the sheet from a mistyped page path', () => {
    setup()
    render(<NotFound />)
    expect(JoinSheet).toHaveBeenCalledWith(expect.not.objectContaining({ initialValue: expect.anything() }), undefined)
  })
})
