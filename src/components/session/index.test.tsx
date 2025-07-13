import { choices, decisions, placeDetails, session, sessionId, statusDeciding, user, userId } from '@test/__mocks__'
import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Auth } from 'aws-amplify'
import * as gatsby from 'gatsby'
import React from 'react'

import VoteSession from './index'
import Logo from '@components/logo'
import * as chooseeService from '@services/choosee'
import { PlaceDetails, StatusObject } from '@types'

jest.mock('aws-amplify')
jest.mock('@components/logo')
jest.mock('gatsby')
jest.mock('@services/choosee')

describe('Session component', () => {
  const mockSetAuthState = jest.fn()
  const mockSetShowLogin = jest.fn()
  const placeNoPic = { ...placeDetails, photos: [], priceLevel: 2, rating: 1 }

  beforeAll(() => {
    console.error = jest.fn()
    window.HTMLElement.prototype.scrollIntoView = jest.fn()

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { origin: 'https://dbowland.com' },
    })

    jest.mocked(Logo).mockReturnValue(<>Logo</>)
    jest.mocked(chooseeService).fetchChoices.mockResolvedValue(choices)
    jest.mocked(chooseeService).fetchDecision.mockResolvedValue(decisions)
    jest.mocked(chooseeService).fetchSession.mockResolvedValue(session)
  })

  describe('signed out', () => {
    beforeAll(() => {
      jest.mocked(Auth).currentAuthenticatedUser.mockRejectedValue(undefined)
    })

    describe('expired session', () => {
      it('should show expired message when session expired', async () => {
        jest.mocked(chooseeService).fetchSession.mockRejectedValueOnce(undefined)
        jest.mocked(chooseeService).fetchSession.mockRejectedValueOnce(undefined)
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        expect(await screen.findByText(/Session expired/i)).toBeInTheDocument()
      })

      it('should navigate when make new choices is clicked', async () => {
        jest.mocked(chooseeService).fetchSession.mockRejectedValueOnce(undefined)
        jest.mocked(chooseeService).fetchSession.mockRejectedValueOnce(undefined)
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const user = userEvent.setup()
        const newChoicesButton = (await screen.findByText(/Make new choices/i)) as HTMLButtonElement
        await act(async () => {
          await user.click(newChoicesButton)
        })

        expect(gatsby.navigate).toHaveBeenCalledWith('/')
      })
    })

    describe('userId log in', () => {
      it('should set userId text box from initialUserId', async () => {
        render(
          <VoteSession
            initialUserId={'fnord'}
            sessionId={sessionId}
            setAuthState={mockSetAuthState}
            setShowLogin={mockSetShowLogin}
          />,
        )

        const userIdInput = (await screen.findByLabelText(/Your phone number/i)) as HTMLInputElement
        expect(userIdInput.value).toEqual('fnord')
      })

      it('should show message for invalid userId', async () => {
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const user = userEvent.setup()
        const userIdInput = (await screen.findByLabelText(/Your phone number/i)) as HTMLInputElement
        await act(async () => {
          await user.clear(userIdInput)
          await user.type(userIdInput, '+1555')
        })

        const chooseButton = (await screen.findByText(/Let's choose!/i, { selector: 'button' })) as HTMLButtonElement
        await act(async () => {
          await user.click(chooseButton)
        })

        expect(await screen.findByText(/Invalid phone number. Be sure to include area code./i)).toBeInTheDocument()
      })

      it('should log in with valid userId', async () => {
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const user = userEvent.setup()
        const userIdInput = (await screen.findByLabelText(/Your phone number/i)) as HTMLInputElement
        await act(async () => {
          await user.clear(userIdInput)
          await user.type(userIdInput, userId)
          await user.keyboard('{Escape}')
        })

        const chooseButton = (await screen.findByText(/Let's choose!/i, { selector: 'button' })) as HTMLButtonElement
        await act(async () => {
          await user.click(chooseButton)
        })

        expect(await screen.findByText(/Columbia, MO 65203, USA/i)).toBeInTheDocument()
        expect(await screen.findByText(/Shakespeare's Pizza - Downtown/i)).toBeInTheDocument()
        expect(chooseeService.fetchDecision).toHaveBeenCalledWith('aeio', '+18005551234')
      })

      it('should log in when enter key is pressed', async () => {
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const user = userEvent.setup()
        const userIdInput = (await screen.findByLabelText(/Your phone number/i)) as HTMLInputElement
        await act(async () => {
          await user.clear(userIdInput)
          await user.type(userIdInput, userId)
          await user.keyboard('{Enter}')
        })

        expect(await screen.findByText(/Columbia, MO 65203, USA/i)).toBeInTheDocument()
        expect(await screen.findByText(/Shakespeare's Pizza - Downtown/i)).toBeInTheDocument()
        expect(chooseeService.fetchDecision).toHaveBeenCalledWith('aeio', '+18005551234')
      })
    })

    describe('sign in', () => {
      it('should invoke Authenticator when sign in is clicked', async () => {
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const user = userEvent.setup()
        const chooseButton = (await screen.findByText(/Sign in/i, { selector: 'button' })) as HTMLButtonElement
        await act(async () => {
          await user.click(chooseButton)
        })

        expect(mockSetAuthState).toHaveBeenCalledWith('signIn')
        expect(mockSetShowLogin).toHaveBeenCalledWith(true)
      })
    })

    describe('sign up', () => {
      it('should invoke Authenticator when sign up is clicked', async () => {
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const user = userEvent.setup()
        const chooseButton = (await screen.findByText(/Sign up/i, { selector: 'button' })) as HTMLButtonElement
        await act(async () => {
          await user.click(chooseButton)
        })

        expect(mockSetAuthState).toHaveBeenCalledWith('signUp')
        expect(mockSetShowLogin).toHaveBeenCalledWith(true)
      })
    })
  })

  describe('signed in', () => {
    const choicesPage2: PlaceDetails[] = [
      {
        formattedPriceLevel: { label: 'Inexpensive', rating: 1 },
        name: 'White Castle',
        photos: ['https://lh3.googleusercontent.com/places/WhiteCastle'],
        priceLevel: 1,
        rating: 1,
        vicinity: '3401 Clark Lane, Columbia',
      },
    ]
    const statusPage2 = { ...session, status: { ...statusDeciding, pageId: 2 } }

    beforeAll(() => {
      jest.mocked(Auth).currentAuthenticatedUser.mockResolvedValue(user)
    })

    describe('deciding', () => {
      it('should show first place when signed in', async () => {
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        expect(await screen.findByText(/Columbia, MO 65203, USA/i)).toBeInTheDocument()
        expect(await screen.findByText(/Shakespeare's Pizza - Downtown/i)).toBeInTheDocument()
        expect(chooseeService.fetchDecision).toHaveBeenCalledWith('aeio', '+15551234567')
      })

      it('should show second place after yes vote', async () => {
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const user = userEvent.setup()
        const yesButton = (await screen.findByText(/Sounds good/i)) as HTMLButtonElement
        await act(async () => {
          await user.click(yesButton)
        })

        expect(await screen.findByText(/Columbia, MO 65203, USA/i)).toBeInTheDocument()
        expect(await screen.findByText(/Subway/i)).toBeInTheDocument()
      })

      it('should scroll window on vote', async () => {
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const user = userEvent.setup()
        const yesButton = (await screen.findByText(/Sounds good/i)) as HTMLButtonElement
        await act(async () => {
          await user.click(yesButton)
        })

        expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith()
      })

      it('should show second place after no vote', async () => {
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const user = userEvent.setup()
        const noButton = (await screen.findByText(/Maybe later/i)) as HTMLButtonElement
        await act(async () => {
          await user.click(noButton)
        })

        expect(await screen.findByText(/Columbia, MO 65203, USA/i)).toBeInTheDocument()
        expect(await screen.findByText(/Subway/i)).toBeInTheDocument()
      })

      it('should show second place when first is in decisions', async () => {
        jest.mocked(chooseeService).fetchDecision.mockResolvedValueOnce({ decisions: { [choices[0].name]: true } })
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        expect(await screen.findByText(/Columbia, MO 65203, USA/i)).toBeInTheDocument()
        expect(await screen.findByText(/Subway/i)).toBeInTheDocument()
      })

      it('should show third place when first two are in decisions', async () => {
        jest.mocked(chooseeService).fetchDecision.mockResolvedValueOnce({
          decisions: { [choices[0].name]: true, [choices[1].name]: true },
        })
        jest.mocked(chooseeService).fetchChoices.mockResolvedValueOnce([...choices, ...choicesPage2])
        jest.mocked(chooseeService).fetchChoices.mockResolvedValueOnce([...choices, ...choicesPage2])
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        expect(await screen.findByText(/Columbia, MO 65203, USA/i)).toBeInTheDocument()
        expect(await screen.findByText(/White Castle/i)).toBeInTheDocument()
      })

      it('should show error message when fetch fails', async () => {
        jest.mocked(chooseeService).fetchDecision.mockRejectedValueOnce(undefined)
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        expect(await screen.findByText(/Error fetching decisions/i)).toBeInTheDocument()
      })

      it('should pass vote results to PATCH endpoint', async () => {
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const user = userEvent.setup()
        await screen.findByText(/Shakespeare's Pizza - Downtown/i)
        const yesButton = (await screen.findByText(/Sounds good/i)) as HTMLButtonElement
        await act(async () => {
          await user.click(yesButton)
        })
        await screen.findByText(/Subway/i)
        const noButton = (await screen.findByText(/Maybe later/i)) as HTMLButtonElement
        await act(async () => {
          await user.click(noButton)
        })

        expect(chooseeService.updateDecision).toHaveBeenCalledWith(
          'aeio',
          '+15551234567',
          expect.arrayContaining([
            { op: 'add', path: "/decisions/Shakespeare's Pizza - Downtown", value: true },
            { op: 'add', path: '/decisions/Subway', value: false },
          ]),
        )
      })

      it('should show error message when PATCH endpoint rejects', async () => {
        jest.mocked(chooseeService).updateDecision.mockRejectedValueOnce(undefined)
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const user = userEvent.setup()
        const yesButton = (await screen.findByText(/Sounds good/i)) as HTMLButtonElement
        await act(async () => {
          await user.click(yesButton)
        })
        await screen.findByText(/Subway/i)
        const noButton = (await screen.findByText(/Maybe later/i)) as HTMLButtonElement
        await act(async () => {
          await user.click(noButton)
        })

        expect(await screen.findByText(/Error saving decisions/i)).toBeInTheDocument()
      })
    })

    describe('choices', () => {
      it('should show RestaurantIcon when place has no picture', async () => {
        jest.mocked(chooseeService).fetchChoices.mockResolvedValueOnce([placeNoPic])
        jest.mocked(chooseeService).fetchChoices.mockResolvedValueOnce([placeNoPic])
        jest.mocked(chooseeService).fetchDecision.mockResolvedValue({ decisions: {} })
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        expect(await screen.findByTitle(/Restaurant icon/i)).toBeInTheDocument()
      })

      it('should show waiting for voters message when choices exhausted', async () => {
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const user = userEvent.setup()
        const yesButton = (await screen.findByText(/Sounds good/i)) as HTMLButtonElement
        await act(async () => {
          await user.click(yesButton)
        })
        await screen.findByText(/Subway/i)
        const noButton = (await screen.findByText(/Maybe later/i)) as HTMLButtonElement
        await act(async () => {
          await user.click(noButton)
        })

        expect(await screen.findByText(/Waiting for other voters/i)).toBeInTheDocument()
      })

      it('should show refresh message when refreshes exhausted', async () => {
        render(
          <VoteSession
            maxStatusRefreshCount={0}
            sessionId={sessionId}
            setAuthState={mockSetAuthState}
            setShowLogin={mockSetShowLogin}
          />,
        )

        const user = userEvent.setup()
        const yesButton = (await screen.findByText(/Sounds good/i)) as HTMLButtonElement
        await act(async () => {
          await user.click(yesButton)
        })
        await screen.findByText(/Subway/i)
        const noButton = (await screen.findByText(/Maybe later/i)) as HTMLButtonElement
        await act(async () => {
          await user.click(noButton)
        })

        expect(await screen.findByText(/Please refresh the page/i)).toBeInTheDocument()
      })

      it('should display second set of choices when first exhausted', async () => {
        jest.mocked(chooseeService).fetchChoices.mockResolvedValueOnce(choicesPage2)
        jest.mocked(chooseeService).fetchChoices.mockResolvedValueOnce(choicesPage2)
        jest.mocked(chooseeService).fetchSession.mockResolvedValueOnce(statusPage2)
        jest.mocked(chooseeService).fetchSession.mockResolvedValueOnce(statusPage2)
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        expect(await screen.findByText(/Columbia, MO 65203, USA/i)).toBeInTheDocument()
        expect(await screen.findByText(/White Castle/i)).toBeInTheDocument()
      })

      it('should show finished message when all choices exhausted', async () => {
        const finishedSession = {
          ...session,
          status: { ...statusDeciding, current: 'finished' } as StatusObject,
        }
        jest.mocked(chooseeService).fetchChoices.mockResolvedValueOnce(choices)
        jest.mocked(chooseeService).fetchChoices.mockResolvedValueOnce(choices)
        jest.mocked(chooseeService).fetchSession.mockResolvedValueOnce(finishedSession)
        jest.mocked(chooseeService).fetchSession.mockResolvedValueOnce(finishedSession)
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        expect(await screen.findByText(/Choices exhausted/i)).toBeInTheDocument()
      })

      it('should navigate when make new choices is clicked from finished state', async () => {
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)
        jest.mocked(chooseeService).fetchSession.mockResolvedValueOnce({
          ...session,
          status: { ...statusDeciding, current: 'finished' },
        })

        const user = userEvent.setup()
        const newChoicesButton = (await screen.findByText(/Make new choices/i)) as HTMLButtonElement
        await act(async () => {
          await user.click(newChoicesButton)
        })

        expect(gatsby.navigate).toHaveBeenCalledWith('/')
      })
    })

    describe('owner', () => {
      it('should show correct URL when logged in', async () => {
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const urlInput: HTMLInputElement = (await screen.findByLabelText(/Invite URL/i)) as HTMLInputElement
        await waitFor(() => {
          expect(urlInput.value).toEqual('https://dbowland.com/s/aeio')
        })
      })

      it('should not show owner section to non-owner', async () => {
        jest
          .mocked(Auth)
          .currentAuthenticatedUser.mockResolvedValueOnce({ ...user, attributes: { sub: 'another-user' } })
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        expect(screen.queryByLabelText(/Session URL/i)).not.toBeInTheDocument()
      })

      it('should invoke writeText and display message when copy is clicked', async () => {
        const mockCopyToClipboard = jest.fn()
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: { writeText: mockCopyToClipboard },
        })

        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        await screen.findByLabelText(/Number of voters/i)
        const copyLinkButton = (await screen.findByText(/Copy invite URL/i, {
          selector: 'button',
        })) as HTMLButtonElement
        fireEvent.click(copyLinkButton)

        expect(await screen.findByText(/Link copied to clipboard/i)).toBeInTheDocument()
        expect(mockCopyToClipboard).toHaveBeenCalled()
      })

      it('should remove success message when close button is clicked', async () => {
        const mockCopyToClipboard = jest.fn()
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: { writeText: mockCopyToClipboard },
        })
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const user = userEvent.setup()
        await screen.findByLabelText(/Number of voters/i)
        const copyLinkButton = (await screen.findByText(/Copy invite URL/i, {
          selector: 'button',
        })) as HTMLButtonElement
        fireEvent.click(copyLinkButton)
        const closeSnackbarButton = (await screen.findByLabelText(/Close/i, {
          selector: 'button',
        })) as HTMLButtonElement
        await act(async () => {
          await user.click(closeSnackbarButton)
        })

        expect(screen.queryByText(/Link copied to clipboard/i)).not.toBeInTheDocument()
      })

      it('should display error when copy throws exception', async () => {
        const mockCopyToClipboard = jest.fn().mockImplementationOnce(() => {
          throw new Error('A wild error appeared')
        })
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: { writeText: mockCopyToClipboard },
        })
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        await screen.findByLabelText(/Number of voters/i)
        const copyLinkButton = (await screen.findByText(/Copy invite URL/i, {
          selector: 'button',
        })) as HTMLButtonElement
        fireEvent.click(copyLinkButton)

        expect(await screen.findByText(/Could not copy link to clipboard/i)).toBeInTheDocument()
        expect(mockCopyToClipboard).toHaveBeenCalled()
      })

      it('should remove error message when close button is clicked', async () => {
        const mockCopyToClipboard = jest.fn().mockImplementationOnce(() => {
          throw new Error('A wild error appeared')
        })
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: { writeText: mockCopyToClipboard },
        })
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const user = userEvent.setup()
        await screen.findByLabelText(/Number of voters/i)
        const copyLinkButton = (await screen.findByText(/Copy invite URL/i, {
          selector: 'button',
        })) as HTMLButtonElement
        fireEvent.click(copyLinkButton)
        const closeSnackbarButton = (await screen.findByLabelText(/Close/i, {
          selector: 'button',
        })) as HTMLButtonElement
        await act(async () => {
          await user.click(closeSnackbarButton)
        })

        expect(screen.queryByText(/Could not copy link to clipboard/i)).not.toBeInTheDocument()
      })

      it('should invoke updateSession with patched Session', async () => {
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const user = userEvent.setup()
        const voterSliderInput = (await screen.findByLabelText(/Number of voters/i)) as HTMLInputElement
        fireEvent.change(voterSliderInput, { target: { value: 4 } })
        const updateButton = (await screen.findByText(/Update vote options/i, {
          selector: 'button',
        })) as HTMLButtonElement
        await act(async () => {
          await user.click(updateButton)
        })

        expect(chooseeService.updateSession).toHaveBeenCalledWith(sessionId, [
          { op: 'test', path: '/voterCount', value: 2 },
          { op: 'replace', path: '/voterCount', value: 4 },
        ])
      })

      it('should show error message when updateSession rejects', async () => {
        jest.mocked(chooseeService).updateSession.mockRejectedValueOnce(undefined)
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const user = userEvent.setup()
        const updateButton = (await screen.findByText(/Update vote options/i, {
          selector: 'button',
        })) as HTMLButtonElement
        await act(async () => {
          await user.click(updateButton)
        })

        expect(await screen.findByText(/Error updating vote session/i)).toBeInTheDocument()
      })
    })

    describe('winner', () => {
      const winnerSession = {
        ...session,
        status: {
          ...statusDeciding,
          current: 'winner',
          winner: placeDetails,
        } as StatusObject,
      }

      it('should show winner message when winner is selected', async () => {
        jest.mocked(chooseeService).fetchChoices.mockResolvedValueOnce(choices)
        jest.mocked(chooseeService).fetchChoices.mockResolvedValueOnce(choices)
        jest.mocked(chooseeService).fetchSession.mockResolvedValueOnce(winnerSession)
        jest.mocked(chooseeService).fetchSession.mockResolvedValueOnce(winnerSession)
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        expect(await screen.findByText(/The winning decision is/i)).toBeInTheDocument()
        expect(await screen.findByText(/Dave's Place/i)).toBeInTheDocument()
      })

      it('should show RestaurantIcon when winner has no picture', async () => {
        const noPictureWinner = {
          ...session,
          status: {
            ...statusDeciding,
            current: 'winner',
            winner: placeNoPic,
          } as StatusObject,
        }
        jest.mocked(chooseeService).fetchSession.mockResolvedValueOnce(noPictureWinner)
        jest.mocked(chooseeService).fetchSession.mockResolvedValueOnce(noPictureWinner)
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        expect(await screen.findByTitle(/Restaurant icon/i)).toBeInTheDocument()
      })

      it('should show vicinity when formattedAddress is undefined', async () => {
        const noAddressWinner = {
          ...session,
          status: {
            ...statusDeciding,
            current: 'winner',
            winner: {
              ...placeDetails,
              formattedAddress: undefined,
            },
          } as StatusObject,
        }
        jest.mocked(chooseeService).fetchSession.mockResolvedValueOnce(noAddressWinner)
        jest.mocked(chooseeService).fetchSession.mockResolvedValueOnce(noAddressWinner)
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        expect(await screen.findByText(/Columbia/i)).toBeInTheDocument()
      })

      it('should navigate when make new choices is clicked from winner state', async () => {
        jest.mocked(chooseeService).fetchSession.mockResolvedValueOnce(winnerSession)
        jest.mocked(chooseeService).fetchSession.mockResolvedValueOnce(winnerSession)
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const user = userEvent.setup()
        const newChoicesButton = (await screen.findByText(/Make new choices/i)) as HTMLButtonElement
        await act(async () => {
          await user.click(newChoicesButton)
        })

        expect(gatsby.navigate).toHaveBeenCalledWith('/')
      })
    })

    describe('service errors', () => {
      it('should show error message on bad status', async () => {
        const badSession = {
          ...session,
          status: {
            ...statusDeciding,
            current: 'bad_status',
          } as any, // "as any" required because "current" is being set to an invalid status
        }
        jest.mocked(Auth).currentAuthenticatedUser.mockResolvedValueOnce(user)
        jest.mocked(chooseeService).fetchSession.mockResolvedValueOnce(badSession)
        jest.mocked(chooseeService).fetchSession.mockResolvedValueOnce(badSession)
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        await waitFor(async () => {
          expect(await screen.findByText(/An error has occurred/i)).toBeInTheDocument()
        })
      })

      it('should show error message when fetchChoices rejects', async () => {
        jest.mocked(chooseeService).fetchChoices.mockRejectedValueOnce(undefined)
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        expect(await screen.findByText(/Error fetching choices/i)).toBeInTheDocument()
      })
    })
  })
})
