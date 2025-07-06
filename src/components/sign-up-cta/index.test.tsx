import '@testing-library/jest-dom'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

import SignUpCta from './index'

jest.mock('@components/logo')

describe('SignUpCta component', () => {
  const setAuthState = jest.fn()
  const setShowLogin = jest.fn()

  beforeAll(() => {
    console.error = jest.fn()
  })

  it('should render sign up button', async () => {
    render(<SignUpCta setAuthState={setAuthState} setShowLogin={setShowLogin} />)
    expect((await screen.findAllByText(/Sign up/i, { selector: 'button' }))[0]).toBeInTheDocument()
  })

  it('should invoke setAuthState and setShowLogin when sign up button is clicked', async () => {
    render(<SignUpCta setAuthState={setAuthState} setShowLogin={setShowLogin} />)

    const user = userEvent.setup()
    const signUpButton = (await screen.findAllByText(/Sign up/i, { selector: 'button' }))[0] as HTMLButtonElement
    await act(async () => {
      await user.click(signUpButton)
    })

    expect(setAuthState).toHaveBeenCalledWith('signUp')
    expect(setShowLogin).toHaveBeenCalledWith(true)
  })
})
