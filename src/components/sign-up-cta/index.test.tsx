import '@testing-library/jest-dom'
import { act, render, screen } from '@testing-library/react'
import React from 'react'

import SignUpCta from './index'

jest.mock('@components/logo')

describe('SignUpCta component', () => {
  const consoleError = console.error
  const setAuthState = jest.fn()
  const setShowLogin = jest.fn()

  beforeAll(() => {
    console.error = jest.fn()
  })

  afterAll(() => {
    console.error = consoleError
  })

  test('expect sign up button to be rendered', async () => {
    render(<SignUpCta setAuthState={setAuthState} setShowLogin={setShowLogin} />)
    expect((await screen.findAllByText(/Sign up/i, { selector: 'button' }))[0]).toBeInTheDocument()
  })

  test('expect sign up button invokes setAuthState and setShowLogin', async () => {
    render(<SignUpCta setAuthState={setAuthState} setShowLogin={setShowLogin} />)

    const signUpButton = (await screen.findAllByText(/Sign up/i, { selector: 'button' }))[0] as HTMLButtonElement
    await act(async () => {
      signUpButton.click()
    })

    expect(setAuthState).toHaveBeenCalledWith('signUp')
    expect(setShowLogin).toHaveBeenCalledWith(true)
  })
})
