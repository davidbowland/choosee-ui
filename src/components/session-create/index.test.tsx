import SignUpCta from '@components/sign-up-cta'
import { placeTypesResults, recaptchaToken, sessionId, user } from '@test/__mocks__'
import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Auth } from 'aws-amplify'
import React from 'react'

import SessionCreate from './index'
import * as chooseeService from '@services/choosee'

jest.mock('aws-amplify')
jest.mock('@aws-amplify/analytics')
jest.mock('@components/sign-up-cta')
jest.mock('gatsby')
jest.mock('@services/choosee')

describe('SessionCreate component', () => {
  const address = '90210'
  const coords = { latitude: 38.897957, longitude: -77.03656 }

  const getCurrentPosition = jest.fn()
  const grecaptchaExecute = jest.fn()
  const setAuthState = jest.fn()
  const setShowLogin = jest.fn()

  beforeAll(() => {
    jest.mocked(chooseeService).fetchPlaceTypes.mockResolvedValue(placeTypesResults)
    jest.mocked(SignUpCta).mockReturnValue(<></>)

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
    grecaptchaExecute.mockResolvedValue(recaptchaToken)
  })

  describe('signed out', () => {
    beforeAll(() => {
      jest.mocked(Auth).currentAuthenticatedUser.mockRejectedValue(undefined)
      jest.mocked(chooseeService).fetchAddress.mockResolvedValue({ address })
      jest.mocked(chooseeService).createSession.mockResolvedValue({ sessionId })
    })

    it('should populate address when returned', async () => {
      getCurrentPosition.mockReturnValueOnce({ coords })
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)
      const addressInput = (await screen.findByLabelText(/Your address/i)) as HTMLInputElement

      await waitFor(() => expect(addressInput.value).toEqual(address))
      expect(chooseeService.fetchAddress).toHaveBeenCalledWith(coords.latitude, coords.longitude, 'qwertyuiokjhgffgh')
    })

    it('should not populate address when no result', async () => {
      getCurrentPosition.mockReturnValueOnce({ coords })
      jest.mocked(chooseeService).fetchAddress.mockRejectedValueOnce(undefined)
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)
      const addressInput = (await screen.findByLabelText(/Your address/i)) as HTMLInputElement

      await waitFor(() =>
        expect(chooseeService.fetchAddress).toHaveBeenCalledWith(
          coords.latitude,
          coords.longitude,
          'qwertyuiokjhgffgh',
        ),
      )
      expect(addressInput.value).toEqual('')
    })

    it('should show error message on FORBIDDEN response from fetchAddress', async () => {
      getCurrentPosition.mockReturnValueOnce({ coords })
      jest.mocked(chooseeService).fetchAddress.mockRejectedValueOnce({ response: { status: 403 } })
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)

      expect(await screen.findByText(/Unusual traffic detected, please log in to continue/i)).toBeInTheDocument()
    })

    it('should call createSession with new Session', async () => {
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)

      const addressInput = (await screen.findByLabelText(/Your address/i)) as HTMLInputElement
      fireEvent.change(addressInput, { target: { value: address } })

      const milesSliderInput = (await screen.findByLabelText(/Maximum distance/i)) as HTMLInputElement
      fireEvent.change(milesSliderInput, { target: { value: 1 } })

      const voterSliderInput = (await screen.findByLabelText(/Number of voters/i)) as HTMLInputElement
      fireEvent.change(voterSliderInput, { target: { value: 4 } })

      const user = userEvent.setup()
      const chooseButton = (await screen.findByText(/Choose restaurants/i, { selector: 'button' })) as HTMLButtonElement
      await act(async () => {
        await user.click(chooseButton)
      })

      await waitFor(() => expect(chooseeService.createSession).toHaveBeenCalled())
      expect(chooseeService.createSession).toHaveBeenCalledWith(
        {
          address: '90210',
          exclude: ['fast_food_restaurant'],
          radius: 1_609.34,
          rankBy: 'POPULARITY',
          type: ['restaurant'],
          voterCount: 4,
        },
        'qwertyuiokjhgffgh',
      )
    })

    it('should show error message on FORBIDDEN response from createSession', async () => {
      jest.mocked(chooseeService).createSession.mockRejectedValueOnce({ response: { status: 403 } })
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)

      const user = userEvent.setup()
      const addressInput = (await screen.findByLabelText(/Your address/i)) as HTMLInputElement
      await act(async () => {
        await user.clear(addressInput)
        await user.type(addressInput, address)
      })

      const chooseButton = (await screen.findByText(/Choose restaurants/i, { selector: 'button' })) as HTMLButtonElement
      await act(async () => {
        await user.click(chooseButton)
      })

      expect(await screen.findByText(/Unusual traffic detected, please log in to continue/i)).toBeInTheDocument()
    })

    it('should render SignUpCta', () => {
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)
      expect(SignUpCta).toHaveBeenCalledTimes(1)
    })
  })

  describe('signed in', () => {
    const otherVoterPhone = '+18005551111'

    beforeAll(() => {
      jest.mocked(Auth).currentAuthenticatedUser.mockResolvedValue(user)
      jest.mocked(chooseeService).fetchAddressAuthenticated.mockResolvedValue({ address })
      jest.mocked(chooseeService).createSessionAuthenticated.mockResolvedValue({ sessionId })
    })

    it('should show error message when no address', async () => {
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)

      const user = userEvent.setup()
      const chooseButton = (await screen.findByText(/Choose restaurants/i, { selector: 'button' })) as HTMLButtonElement
      await act(async () => {
        await user.click(chooseButton)
      })

      expect(await screen.findByText(/Please enter your address to begin/i)).toBeInTheDocument()
    })

    it('should call createSessionAuthenticated with new Session', async () => {
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)

      const user = userEvent.setup()
      const addressInput = (await screen.findByLabelText(/Your address/i)) as HTMLInputElement
      await act(async () => {
        await user.clear(addressInput)
        await user.type(addressInput, address)
      })

      const milesSliderInput = (await screen.findByLabelText(/Maximum distance/i)) as HTMLInputElement
      fireEvent.change(milesSliderInput, { target: { value: 1 } })

      const voterSliderInput = (await screen.findByLabelText(/Number of voters/i)) as HTMLInputElement
      fireEvent.change(voterSliderInput, { target: { value: 4 } })

      const chooseButton = (await screen.findByText(/Choose restaurants/i, { selector: 'button' })) as HTMLButtonElement
      await act(async () => {
        await user.click(chooseButton)
      })

      expect(chooseeService.createSessionAuthenticated).toHaveBeenCalledWith({
        address: '90210',
        exclude: ['fast_food_restaurant'],
        radius: 1_609.34,
        rankBy: 'POPULARITY',
        type: ['restaurant'],
        voterCount: 4,
      })
    })

    it('should remove success message when closed', async () => {
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)

      const user = userEvent.setup()
      const addressInput = (await screen.findByLabelText(/Your address/i)) as HTMLInputElement
      await act(async () => {
        await user.clear(addressInput)
        await user.type(addressInput, address)
      })

      const milesSliderInput = (await screen.findByLabelText(/Maximum distance/i)) as HTMLInputElement
      fireEvent.change(milesSliderInput, { target: { value: 1 } })

      const voterSliderInput = (await screen.findByLabelText(/Number of voters/i)) as HTMLInputElement
      fireEvent.change(voterSliderInput, { target: { value: 4 } })

      const chooseButton = (await screen.findByText(/Choose restaurants/i, { selector: 'button' })) as HTMLButtonElement
      await act(async () => {
        await user.click(chooseButton)
      })

      await waitFor(() => screen.findByText(/Choosee voting session starting/i))
      const closeSnackbarButton = (await screen.findByLabelText(/Close/i, { selector: 'button' })) as HTMLButtonElement
      await act(async () => {
        await user.click(closeSnackbarButton)
      })

      await expect(() => screen.findByText(/Choosee voting session starting/i)).rejects.toBeDefined()
    })

    it('should show error when invalid phone number entered', async () => {
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)

      const user = userEvent.setup()
      const addressInput = (await screen.findByLabelText(/Your address/i)) as HTMLInputElement
      await act(async () => {
        await user.clear(addressInput)
        await user.type(addressInput, address)
      })

      const sliderInput = (await screen.findByLabelText(/Number of voters/i)) as HTMLInputElement
      fireEvent.change(sliderInput, { target: { value: 2 } })

      const voterPhoneInput = (await screen.findByLabelText(/Voter #2 phone number/i)) as HTMLInputElement
      await act(async () => {
        await user.clear(voterPhoneInput)
        await user.type(voterPhoneInput, '+12345')
      })

      const chooseButton = (await screen.findByText(/Choose restaurants/i, { selector: 'button' })) as HTMLButtonElement
      await act(async () => {
        await user.click(chooseButton)
      })

      expect(await screen.findByText(/Invalid phone number/i)).toBeInTheDocument()
    })

    it('should call textSession when voter phone entered', async () => {
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)

      const user = userEvent.setup()
      const addressInput = (await screen.findByLabelText(/Your address/i)) as HTMLInputElement
      await act(async () => {
        await user.clear(addressInput)
        await user.type(addressInput, address)
      })

      const sliderInput = (await screen.findByLabelText(/Number of voters/i)) as HTMLInputElement
      fireEvent.change(sliderInput, { target: { value: 2 } })

      const voterPhoneInput = (await screen.findByLabelText(/Voter #2 phone number/i)) as HTMLInputElement
      await act(async () => {
        await user.clear(voterPhoneInput)
        await user.type(voterPhoneInput, otherVoterPhone)
      })

      const chooseButton = (await screen.findByText(/Choose restaurants/i, { selector: 'button' })) as HTMLButtonElement
      await act(async () => {
        await user.click(chooseButton)
      })

      await waitFor(() => expect(chooseeService.textSession).toHaveBeenCalled())
      expect(chooseeService.textSession).toHaveBeenCalledWith(sessionId, otherVoterPhone)
    })

    it('should show error message on createSession error', async () => {
      jest.mocked(chooseeService).createSessionAuthenticated.mockRejectedValueOnce(undefined)
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)

      const user = userEvent.setup()
      const addressInput = (await screen.findByLabelText(/Your address/i)) as HTMLInputElement
      await act(async () => {
        await user.clear(addressInput)
        await user.type(addressInput, address)
      })

      const chooseButton = (await screen.findByText(/Choose restaurants/i, { selector: 'button' })) as HTMLButtonElement
      await act(async () => {
        await user.click(chooseButton)
      })

      expect(await screen.findByText(/Please try again/i)).toBeInTheDocument()
    })

    it('should remove error message when closed', async () => {
      jest.mocked(chooseeService).createSessionAuthenticated.mockRejectedValueOnce(undefined)
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)

      const user = userEvent.setup()
      const addressInput = (await screen.findByLabelText(/Your address/i)) as HTMLInputElement
      await act(async () => {
        await user.clear(addressInput)
        await user.type(addressInput, address)
      })

      const chooseButton = (await screen.findByText(/Choose restaurants/i, { selector: 'button' })) as HTMLButtonElement
      await act(async () => {
        await user.click(chooseButton)
      })

      const closeSnackbarButton = (await screen.findByLabelText(/Close/i, { selector: 'button' })) as HTMLButtonElement
      await act(async () => {
        await user.click(closeSnackbarButton)
      })

      await expect(() => screen.findByText(/Please try again/i)).rejects.toBeDefined()
    })

    it('should display invalid address message when present', async () => {
      jest.mocked(chooseeService).createSessionAuthenticated.mockRejectedValueOnce({ message: 'Invalid address' })
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)

      const user = userEvent.setup()
      const addressInput = (await screen.findByLabelText(/Your address/i)) as HTMLInputElement
      await act(async () => {
        await user.clear(addressInput)
        await user.type(addressInput, address)
      })

      const chooseButton = (await screen.findByText(/Choose restaurants/i, { selector: 'button' })) as HTMLButtonElement
      await act(async () => {
        await user.click(chooseButton)
      })

      expect(await screen.findByText(/Invalid address/i)).toBeInTheDocument()
    })

    it('should populate address when returned', async () => {
      getCurrentPosition.mockReturnValueOnce({ coords })
      getCurrentPosition.mockReturnValueOnce({ coords })
      render(<SessionCreate setAuthState={setAuthState} setShowLogin={setShowLogin} />)
      const addressInput = (await screen.findByLabelText(/Your address/i)) as HTMLInputElement

      await waitFor(() => expect(addressInput.value).toEqual(address))
      expect(chooseeService.fetchAddress).toHaveBeenCalledWith(coords.latitude, coords.longitude, 'qwertyuiokjhgffgh')
      getCurrentPosition.mockReset()
    })
  })
})
