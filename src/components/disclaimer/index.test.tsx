import '@testing-library/jest-dom'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import Cookies from 'universal-cookie'

import Disclaimer from './index'

jest.mock('universal-cookie')

describe('Disclaimer component', () => {
  const mockCookieGet = jest.fn()
  const mockCookieSet = jest.fn()

  beforeAll(() => {
    jest.mocked(Cookies).mockImplementation(
      () =>
        ({
          get: mockCookieGet,
          set: mockCookieSet,
        }) as unknown as Cookies,
    )
  })

  it('should load disclaimer under normal circumstances', async () => {
    render(<Disclaimer />)

    expect(await screen.findByText(/Accept & continue/i)).toBeVisible()
  })

  it('should close disclaimer when button is clicked', async () => {
    render(<Disclaimer />)

    const user = userEvent.setup()
    const closeButton = (await screen.findByText(/Accept & continue/i, {
      selector: 'button',
    })) as HTMLButtonElement

    await act(async () => {
      await user.click(closeButton)
    })

    expect(mockCookieSet).toHaveBeenCalledWith('disclaimer_accept', 'true', {
      path: '/',
      sameSite: 'strict',
      secure: true,
    })
    expect(screen.queryByText(/Cookie and Privacy Disclosure/i)).not.toBeInTheDocument()
  })

  it('should load disclaimer closed when cookie is set', async () => {
    mockCookieGet.mockReturnValueOnce('true')
    render(<Disclaimer />)

    expect(mockCookieGet).toHaveBeenCalledWith('disclaimer_accept')
    expect(screen.queryByText(/Cookie and Privacy Disclosure/i)).not.toBeInTheDocument()
  })
})
