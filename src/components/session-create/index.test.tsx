import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Auth } from 'aws-amplify'
import { mocked } from 'jest-mock'
import React from 'react'

import * as mapsService from '@services/maps'
import * as sessionService from '@services/sessions'
import { recaptchaToken, sessionId, user } from '@test/__mocks__'
import SessionCreate from './index'
import SignUpCta from '@components/sign-up-cta'

jest.mock('aws-amplify')
jest.mock('@aws-amplify/analytics')
jest.mock('@components/sign-up-cta')
jest.mock('gatsby')
jest.mock('@services/maps')
jest.mock('@services/sessions')

describe('SessionCreate component', () => {
  const address = '90210'
  const coords = { latitude: 38.897957, longitude: -77.03656 }

  const getCurrentPosition = jest.fn()
  const grecaptchaExecute = jest.fn()
  const setAuthState = jest.fn()
  const setShowLogin = jest.fn()

  beforeAll(() => {
    console.error = jest.fn()
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (success: any) => {
          const result = getCurrentPosition()
          if (result) {
            success(result)
          }
        },
      },
    })
    Object.defineProperty(window, 'grecaptcha', {
      configurable: true,
      value: { execute: grecaptchaExecute },
    })
    mocked(SignUpCta).mockReturnValue(<></>)
    grecaptchaExecute.mockResolvedValue(recaptchaToken)
  })

  describe('signed out', () => {
    beforeAll(() => {
      mocked(Auth).currentAuthenticatedUser.mockRejectedValue(undefined)
      mocked(mapsService).fetchAddress.mockResolvedValue({ address })
      mocked(sessionService).createSession.mockResolvedValue({ sessionId })
    })

    test('expect address populated when returned', async () => {
      getCurrentPosition.mockReturnValueOnce({ coords })
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)
      const addressInput = (await screen.findByLabelText(/Your address/i)) as HTMLInputElement

      await waitFor(() => expect(addressInput.value).toEqual(address))
      expect(mocked(mapsService).fetchAddress).toHaveBeenCalledWith(
        coords.latitude,
        coords.longitude,
        'qwertyuiokjhgffgh'
      )
    })

    test('expect no address populated when no result', async () => {
      getCurrentPosition.mockReturnValueOnce({ coords })
      mocked(mapsService).fetchAddress.mockRejectedValueOnce(undefined)
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)
      const addressInput = (await screen.findByLabelText(/Your address/i)) as HTMLInputElement

      await waitFor(() =>
        expect(mocked(mapsService).fetchAddress).toHaveBeenCalledWith(
          coords.latitude,
          coords.longitude,
          'qwertyuiokjhgffgh'
        )
      )
      expect(addressInput.value).toEqual('')
    })

    test('expect error message on FORBIDDEN response from fetchAddress', async () => {
      getCurrentPosition.mockReturnValueOnce({ coords })
      mocked(mapsService).fetchAddress.mockRejectedValueOnce({ response: { status: 403 } })
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)

      expect(await screen.findByText(/Unusual traffic detected, please log in to continue/i)).toBeInTheDocument()
    })

    test('expect createSession called with new Session', async () => {
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)

      const addressInput = (await screen.findByLabelText(/Your address/i)) as HTMLInputElement
      fireEvent.change(addressInput, { target: { value: address } })
      const radioButton = (await screen.findByLabelText(/Takeout/i)) as HTMLInputElement
      fireEvent.click(radioButton)
      const checkboxInput = (await screen.findByLabelText(/Only show choices currently open/i)) as HTMLInputElement
      fireEvent.click(checkboxInput)
      const milesSliderInput = (await screen.findByLabelText(/Max distance to restaurant/i)) as HTMLInputElement
      fireEvent.change(milesSliderInput, { target: { value: 1 } })
      const maxPriceSliderInput = (await screen.findAllByLabelText(/Price range/i))[1] as HTMLInputElement
      fireEvent.change(maxPriceSliderInput, { target: { value: 3 } })
      const minPriceSliderInput = (await screen.findAllByLabelText(/Price range/i))[0] as HTMLInputElement
      fireEvent.change(minPriceSliderInput, { target: { value: 2 } })
      const voterSliderInput = (await screen.findByLabelText(/Number of voters/i)) as HTMLInputElement
      fireEvent.change(voterSliderInput, { target: { value: 4 } })
      const chooseButton = (await screen.findByText(/Choose restaurants/i, { selector: 'button' })) as HTMLButtonElement
      fireEvent.click(chooseButton)

      await waitFor(() => expect(mocked(sessionService).createSession).toHaveBeenCalled())
      expect(mocked(sessionService).createSession).toHaveBeenCalledWith(
        {
          address: '90210',
          maxPrice: 3,
          minPrice: 2,
          openNow: false,
          pagesPerRound: 1,
          radius: 1_609.34,
          rankBy: 'prominence',
          type: 'meal_takeaway',
          voterCount: 4,
        },
        'qwertyuiokjhgffgh'
      )
    })

    test('expect error message on FORBIDDEN response from createSession', async () => {
      mocked(sessionService).createSession.mockRejectedValueOnce({ response: { status: 403 } })
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)
      const addressInput = (await screen.findByLabelText(/Your address/i)) as HTMLInputElement
      fireEvent.change(addressInput, { target: { value: address } })
      const chooseButton = (await screen.findByText(/Choose restaurants/i, { selector: 'button' })) as HTMLButtonElement
      fireEvent.click(chooseButton)

      expect(await screen.findByText(/Unusual traffic detected, please log in to continue/i)).toBeInTheDocument()
    })

    test('expect SignUpCta rendered', () => {
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)
      expect(mocked(SignUpCta)).toHaveBeenCalledTimes(1)
    })
  })

  describe('signed in', () => {
    const otherVoterPhone = '+18005551111'

    beforeAll(() => {
      mocked(Auth).currentAuthenticatedUser.mockResolvedValue(user)
      mocked(mapsService).fetchAddressAuthenticated.mockResolvedValue({ address })
      mocked(sessionService).createSessionAuthenticated.mockResolvedValue({ sessionId })
    })

    test('expect address populated when returned', async () => {
      getCurrentPosition.mockReturnValueOnce({ coords })
      getCurrentPosition.mockReturnValueOnce({ coords })
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)
      const addressInput = (await screen.findByLabelText(/Your address/i)) as HTMLInputElement

      await waitFor(() => expect(addressInput.value).toEqual(address))
      expect(mocked(mapsService).fetchAddress).toHaveBeenCalledWith(
        coords.latitude,
        coords.longitude,
        'qwertyuiokjhgffgh'
      )
    })

    test('expect error message when no address', async () => {
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)

      const chooseButton = (await screen.findByText(/Choose restaurants/i, { selector: 'button' })) as HTMLButtonElement
      fireEvent.click(chooseButton)

      expect(await screen.findByText(/Please enter your address to begin/i)).toBeInTheDocument()
    })

    test('expect createSession called with new Session', async () => {
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)

      const addressInput = (await screen.findByLabelText(/Your address/i)) as HTMLInputElement
      fireEvent.change(addressInput, { target: { value: address } })
      const radioButton = (await screen.findByLabelText(/Takeout/i)) as HTMLInputElement
      fireEvent.click(radioButton)
      const checkboxInput = (await screen.findByLabelText(/Only show choices currently open/i)) as HTMLInputElement
      fireEvent.click(checkboxInput)
      const milesSliderInput = (await screen.findByLabelText(/Max distance to restaurant/i)) as HTMLInputElement
      fireEvent.change(milesSliderInput, { target: { value: 1 } })
      const maxPriceSliderInput = (await screen.findAllByLabelText(/Price range/i))[1] as HTMLInputElement
      fireEvent.change(maxPriceSliderInput, { target: { value: 3 } })
      const minPriceSliderInput = (await screen.findAllByLabelText(/Price range/i))[0] as HTMLInputElement
      fireEvent.change(minPriceSliderInput, { target: { value: 2 } })
      const voterSliderInput = (await screen.findByLabelText(/Number of voters/i)) as HTMLInputElement
      fireEvent.change(voterSliderInput, { target: { value: 4 } })
      const chooseButton = (await screen.findByText(/Choose restaurants/i, { selector: 'button' })) as HTMLButtonElement
      fireEvent.click(chooseButton)

      expect(mocked(sessionService).createSessionAuthenticated).toHaveBeenCalledWith({
        address: '90210',
        maxPrice: 3,
        minPrice: 2,
        openNow: false,
        pagesPerRound: 1,
        radius: 1_609.34,
        rankBy: 'prominence',
        type: 'meal_takeaway',
        voterCount: 4,
      })
    })

    test('expect success message removed when closed', async () => {
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)

      const addressInput = (await screen.findByLabelText(/Your address/i)) as HTMLInputElement
      fireEvent.change(addressInput, { target: { value: address } })
      const typeRadioButton = (await screen.findByLabelText(/Takeout/i)) as HTMLInputElement
      fireEvent.click(typeRadioButton)
      const rankRadioButton = (await screen.findByLabelText(/Closest first/i)) as HTMLInputElement
      fireEvent.click(rankRadioButton)
      const sliderInput = (await screen.findByLabelText(/Number of voters/i)) as HTMLInputElement
      fireEvent.change(sliderInput, { target: { value: 4 } })
      const checkboxInput = (await screen.findByLabelText(/Only show choices currently open/i)) as HTMLInputElement
      fireEvent.click(checkboxInput)
      const chooseButton = (await screen.findByText(/Choose restaurants/i, { selector: 'button' })) as HTMLButtonElement
      fireEvent.click(chooseButton)
      await waitFor(() => screen.findByText(/Choosee voting session starting/i))
      const closeSnackbarButton = (await screen.findByLabelText(/Close/i, { selector: 'button' })) as HTMLButtonElement
      fireEvent.click(closeSnackbarButton)

      await expect(() => screen.findByText(/Choosee voting session starting/i)).rejects.toBeDefined()
    })

    test('expect error when invalid phone number entered', async () => {
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)

      const addressInput = (await screen.findByLabelText(/Your address/i)) as HTMLInputElement
      fireEvent.change(addressInput, { target: { value: address } })
      const sliderInput = (await screen.findByLabelText(/Number of voters/i)) as HTMLInputElement
      fireEvent.change(sliderInput, { target: { value: 2 } })
      const voterPhoneInput = (await screen.findByLabelText(/Voter #2 phone number/i)) as HTMLInputElement
      fireEvent.change(voterPhoneInput, { target: { value: '+12345' } })
      const chooseButton = (await screen.findByText(/Choose restaurants/i, { selector: 'button' })) as HTMLButtonElement
      fireEvent.click(chooseButton)

      expect(await screen.findByText(/Invalid phone number/i)).toBeInTheDocument()
    })

    test('expect textSession called when voter phone entered', async () => {
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)

      const addressInput = (await screen.findByLabelText(/Your address/i)) as HTMLInputElement
      fireEvent.change(addressInput, { target: { value: address } })
      const sliderInput = (await screen.findByLabelText(/Number of voters/i)) as HTMLInputElement
      fireEvent.change(sliderInput, { target: { value: 2 } })
      const voterPhoneInput = (await screen.findByLabelText(/Voter #2 phone number/i)) as HTMLInputElement
      fireEvent.change(voterPhoneInput, { target: { value: otherVoterPhone } })
      const chooseButton = (await screen.findByText(/Choose restaurants/i, { selector: 'button' })) as HTMLButtonElement
      fireEvent.click(chooseButton)

      await waitFor(() => expect(mocked(sessionService).textSession).toHaveBeenCalled())
      expect(mocked(sessionService).textSession).toHaveBeenCalledWith(sessionId, otherVoterPhone)
    })

    test('expect error message on createSession error', async () => {
      mocked(sessionService).createSessionAuthenticated.mockRejectedValueOnce(undefined)
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)

      const addressInput = (await screen.findByLabelText(/Your address/i)) as HTMLInputElement
      fireEvent.change(addressInput, { target: { value: address } })
      const chooseButton = (await screen.findByText(/Choose restaurants/i, { selector: 'button' })) as HTMLButtonElement
      fireEvent.click(chooseButton)

      expect(await screen.findByText(/Please try again/i)).toBeInTheDocument()
    })

    test('expect closing error message removes it', async () => {
      mocked(sessionService).createSessionAuthenticated.mockRejectedValueOnce(undefined)
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)

      const addressInput = (await screen.findByLabelText(/Your address/i)) as HTMLInputElement
      fireEvent.change(addressInput, { target: { value: address } })
      const chooseButton = (await screen.findByText(/Choose restaurants/i, { selector: 'button' })) as HTMLButtonElement
      fireEvent.click(chooseButton)
      const closeSnackbarButton = (await screen.findByLabelText(/Close/i, { selector: 'button' })) as HTMLButtonElement
      fireEvent.click(closeSnackbarButton)

      await expect(() => screen.findByText(/Please try again/i)).rejects.toBeDefined()
    })

    test('expect createSession invalid address message displayed when present', async () => {
      mocked(sessionService).createSessionAuthenticated.mockRejectedValueOnce({ message: 'Invalid address' })
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)

      const addressInput = (await screen.findByLabelText(/Your address/i)) as HTMLInputElement
      fireEvent.change(addressInput, { target: { value: address } })
      const chooseButton = (await screen.findByText(/Choose restaurants/i, { selector: 'button' })) as HTMLButtonElement
      fireEvent.click(chooseButton)

      expect(await screen.findByText(/Invalid address/i)).toBeInTheDocument()
    })
  })
})
