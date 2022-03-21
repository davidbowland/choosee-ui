import { Auth } from 'aws-amplify'
import { mocked } from 'jest-mock'
import React from 'react'
import '@testing-library/jest-dom'
import { act, fireEvent, render, screen } from '@testing-library/react'

import Logo from '@components/logo'
import SignUpCta from '@components/sign-up-cta'
import SessionCreate from './index'
import * as sessionService from '@services/sessions'
import { sessionId, user } from '@test/__mocks__'

jest.mock('aws-amplify')
jest.mock('@aws-amplify/analytics')
jest.mock('@components/logo')
jest.mock('@components/sign-up-cta')
jest.mock('gatsby')
jest.mock('@services/sessions')

describe('SessionCreate component', () => {
  const consoleError = console.error
  const setAuthState = jest.fn()
  const setShowLogin = jest.fn()

  beforeAll(() => {
    console.error = jest.fn()
    mocked(Logo).mockReturnValue(<></>)
    mocked(SignUpCta).mockReturnValue(<></>)
  })

  afterAll(() => {
    console.error = consoleError
  })

  describe('signed out', () => {
    beforeAll(() => {
      mocked(Auth).currentAuthenticatedUser.mockRejectedValue(undefined)
    })

    test('expect SignUpCta rendered', () => {
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)
      expect(mocked(SignUpCta)).toHaveBeenCalledTimes(1)
    })
  })

  describe('signed in', () => {
    const address = '90210'

    beforeAll(() => {
      mocked(Auth).currentAuthenticatedUser.mockResolvedValue(user)
      mocked(sessionService).createSession.mockResolvedValue({ sessionId })
    })

    test('expect error message when no address', async () => {
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)

      const chooseButton = (await screen.findByText(/Choose restaurants/i, { selector: 'button' })) as HTMLButtonElement
      act(() => {
        chooseButton.click()
      })

      expect(await screen.findByText(/Please enter your address to begin/i)).toBeInTheDocument()
    })

    test('expect createSession called with new Session', async () => {
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)

      const addressInput = (await screen.findByLabelText(/Your address/i)) as HTMLInputElement
      act(() => {
        fireEvent.change(addressInput, { target: { value: address } })
      })
      const sliderInput = (await screen.findByLabelText(/Search radius in miles/i)) as HTMLInputElement
      act(() => {
        fireEvent.change(sliderInput, { target: { value: 15 } })
      })
      const radioButton = (await screen.findByLabelText(/Takeout/i)) as HTMLInputElement
      act(() => {
        radioButton.click()
      })
      const chooseButton = (await screen.findByText(/Choose restaurants/i, { selector: 'button' })) as HTMLButtonElement
      act(() => {
        chooseButton.click()
      })

      expect(mocked(sessionService).createSession).toHaveBeenCalledWith({
        address: '90210',
        radius: 24_140.1,
        type: 'meal_takeaway',
      })
    })

    test('expect textSession called when checked', async () => {
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)

      const addressInput = (await screen.findByLabelText(/Your address/i)) as HTMLInputElement
      act(() => {
        fireEvent.change(addressInput, { target: { value: address } })
      })
      const checkboxInput = (await screen.findByLabelText(/Text me my session link for sharing/i)) as HTMLInputElement
      act(() => {
        checkboxInput.click()
      })
      const chooseButton = (await screen.findByText(/Choose restaurants/i, { selector: 'button' })) as HTMLButtonElement
      await act(async () => {
        await chooseButton.click()
      })

      expect(mocked(sessionService).textSession).toHaveBeenCalledWith(sessionId)
    })

    test('expect error message on createSession error', async () => {
      mocked(sessionService).createSession.mockRejectedValueOnce(undefined)
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)

      const addressInput = (await screen.findByLabelText(/Your address/i)) as HTMLInputElement
      act(() => {
        fireEvent.change(addressInput, { target: { value: address } })
      })
      const chooseButton = (await screen.findByText(/Choose restaurants/i, { selector: 'button' })) as HTMLButtonElement
      act(() => {
        chooseButton.click()
      })

      expect(await screen.findByText(/Please try again/i)).toBeInTheDocument()
    })

    test('expect createSession invalid address message displayed when present', async () => {
      mocked(sessionService).createSession.mockRejectedValueOnce({ message: 'Invalid address' })
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)

      const addressInput = (await screen.findByLabelText(/Your address/i)) as HTMLInputElement
      act(() => {
        fireEvent.change(addressInput, { target: { value: address } })
      })
      const chooseButton = (await screen.findByText(/Choose restaurants/i, { selector: 'button' })) as HTMLButtonElement
      act(() => {
        chooseButton.click()
      })

      expect(await screen.findByText(/Invalid address/i)).toBeInTheDocument()
    })
  })
})
