import { mocked } from 'jest-mock'
import React from 'react'
import '@testing-library/jest-dom'
import { act, render, screen } from '@testing-library/react'

import Logo from '@components/logo'
import SessionCreate from './index'

jest.mock('@components/logo')

describe('SignUpCta component', () => {
  const consoleError = console.error
  const setAuthState = jest.fn()
  const setShowLogin = jest.fn()

  beforeAll(() => {
    console.error = jest.fn()
    mocked(Logo).mockReturnValue(<></>)
  })

  afterAll(() => {
    console.error = consoleError
  })

  test('expect Logo rendered', () => {
    render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)
    expect(mocked(Logo)).toHaveBeenCalledTimes(1)
  })

  test('expect sign up button to be rendered', async () => {
    render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)
    expect(await screen.findByText(/Sign up/i, { selector: 'button' })).toBeInTheDocument()
  })

  test('expect sign up button invokes setAuthState and setShowLogin', async () => {
    render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)

    const signUpButton = (await screen.findByText(/Sign up/i, { selector: 'button' })) as HTMLButtonElement
    act(() => {
      signUpButton.click()
    })

    expect(setAuthState).toHaveBeenCalledWith('signUp')
    expect(setShowLogin).toHaveBeenCalledWith(true)
  })

  test('expect sign in button invokes setAuthState and setShowLogin', async () => {
    render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)

    const signInButton = (await screen.findByLabelText(/Sign in/i, { selector: 'button' })) as HTMLButtonElement
    act(() => {
      signInButton.click()
    })

    expect(setAuthState).toHaveBeenCalledWith('signIn')
    expect(setShowLogin).toHaveBeenCalledWith(true)
  })
})
