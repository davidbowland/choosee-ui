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
    const otherVoterPhone = '+18005551111'

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
      const radioButton = (await screen.findByLabelText(/Takeout/i)) as HTMLInputElement
      act(() => {
        radioButton.click()
      })
      const sliderInput = (await screen.findByLabelText(/Number of voters/i)) as HTMLInputElement
      act(() => {
        fireEvent.change(sliderInput, { target: { value: 4 } })
      })
      const checkboxInput = (await screen.findByLabelText(/Only show choices currently open/i)) as HTMLInputElement
      act(() => {
        checkboxInput.click()
      })
      const chooseButton = (await screen.findByText(/Choose restaurants/i, { selector: 'button' })) as HTMLButtonElement
      act(() => {
        chooseButton.click()
      })

      expect(mocked(sessionService).createSession).toHaveBeenCalledWith({
        address: '90210',
        openNow: false,
        type: 'meal_takeaway',
        voterCount: 4,
      })
    })

    test('expect error when invalid phone number entered', async () => {
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)

      const addressInput = (await screen.findByLabelText(/Your address/i)) as HTMLInputElement
      act(() => {
        fireEvent.change(addressInput, { target: { value: address } })
      })
      const voterPhoneInput = (await screen.findByLabelText(/Voter #2 phone number/i)) as HTMLInputElement
      act(() => {
        fireEvent.change(voterPhoneInput, { target: { value: '+12345' } })
      })
      const chooseButton = (await screen.findByText(/Choose restaurants/i, { selector: 'button' })) as HTMLButtonElement
      await act(async () => {
        await chooseButton.click()
      })

      expect(await screen.findByText(/Invalid phone number/i)).toBeInTheDocument()
    })

    test('expect textSession called when voter phone entered', async () => {
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)

      const addressInput = (await screen.findByLabelText(/Your address/i)) as HTMLInputElement
      act(() => {
        fireEvent.change(addressInput, { target: { value: address } })
      })
      const voterPhoneInput = (await screen.findByLabelText(/Voter #2 phone number/i)) as HTMLInputElement
      act(() => {
        fireEvent.change(voterPhoneInput, { target: { value: otherVoterPhone } })
      })
      const chooseButton = (await screen.findByText(/Choose restaurants/i, { selector: 'button' })) as HTMLButtonElement
      await act(async () => {
        await chooseButton.click()
      })

      expect(mocked(sessionService).textSession).toHaveBeenCalledWith(sessionId, otherVoterPhone)
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
