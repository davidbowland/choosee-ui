import '@testing-library/jest-dom'
import * as gatsby from 'gatsby'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Auth } from 'aws-amplify'
import React from 'react'
import { mocked } from 'jest-mock'

import * as mapsService from '@services/maps'
import * as sessionService from '@services/sessions'
import {
  choices,
  decisions,
  place,
  placeDetails,
  session,
  sessionId,
  statusDeciding,
  user,
  userId,
} from '@test/__mocks__'
import Logo from '@components/logo'
import VoteSession from './index'

jest.mock('aws-amplify')
jest.mock('@aws-amplify/analytics')
jest.mock('@components/logo')
jest.mock('gatsby')
jest.mock('@services/maps')
jest.mock('@services/sessions')

describe('Session component', () => {
  const consoleError = console.error
  const mockCopyToClipboard = jest.fn()
  const mockSetAuthState = jest.fn()
  const mockSetShowLogin = jest.fn()
  const placeNoPic = { ...placeDetails, photos: [], priceLevel: 2, rating: 1 }

  beforeAll(() => {
    console.error = jest.fn()

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: mockCopyToClipboard },
    })
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { origin: 'https://dbowland.com' },
    })

    mocked(Logo).mockReturnValue(<>Logo</>)
    mocked(mapsService).fetchChoices.mockResolvedValue(choices)
    mocked(sessionService).fetchDecision.mockResolvedValue(decisions)
    mocked(sessionService).fetchSession.mockResolvedValue(session)
  })

  afterAll(() => {
    console.error = consoleError
  })

  describe('signed out', () => {
    beforeAll(() => {
      mocked(Auth).currentAuthenticatedUser.mockRejectedValue(undefined)
    })

    describe('expired session', () => {
      test('expect expired message when session expired', async () => {
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)
        mocked(sessionService).fetchSession.mockRejectedValueOnce(undefined)

        expect(await screen.findByText(/Session expired/i)).toBeInTheDocument()
      })

      test('expect make new choices navigates', async () => {
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)
        mocked(sessionService).fetchSession.mockRejectedValueOnce(undefined)

        const newChoicesButton = (await screen.findByText(/Make new choices/i)) as HTMLButtonElement
        await act(async () => {
          newChoicesButton.click()
        })

        expect(mocked(gatsby).navigate).toHaveBeenCalledWith('/')
      })
    })

    describe('userId log in', () => {
      test('expect initialUserId sets userId text box', async () => {
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const userIdInput = (await screen.findByLabelText(/Your phone number/i)) as HTMLInputElement
        expect(userIdInput.value)
      })

      test('expect invalid userId shows value', async () => {
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const userIdInput = (await screen.findByLabelText(/Your phone number/i)) as HTMLInputElement
        await act(async () => {
          fireEvent.change(userIdInput, { target: { value: '+1555' } })
        })
        const chooseButton = (await screen.findByText(/Let's choose!/i, { selector: 'button' })) as HTMLButtonElement
        await act(async () => {
          chooseButton.click()
        })

        expect(await screen.findByText(/Invalid phone number. Be sure to include area code./i)).toBeInTheDocument()
      })

      test('expect valid userId logs in', async () => {
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const userIdInput = (await screen.findByLabelText(/Your phone number/i)) as HTMLInputElement
        await act(async () => {
          fireEvent.change(userIdInput, { target: { value: userId } })
        })
        const chooseButton = (await screen.findByText(/Let's choose!/i, { selector: 'button' })) as HTMLButtonElement
        await act(async () => {
          chooseButton.click()
        })

        expect(await screen.findByText(/Columbia, MO 65203, USA/i)).toBeInTheDocument()
        expect(await screen.findByText(/Shakespeare's Pizza - Downtown/i)).toBeInTheDocument()
        expect(mocked(sessionService).fetchDecision).toHaveBeenCalledWith('aeio', '+18005551234')
      })
    })

    describe('sign in', () => {
      test('expect clicking sign in invokes Authenticator', async () => {
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const chooseButton = (await screen.findByText(/Sign in/i, { selector: 'button' })) as HTMLButtonElement
        await act(async () => {
          chooseButton.click()
        })

        expect(mockSetAuthState).toHaveBeenCalledWith('signIn')
        expect(mockSetShowLogin).toHaveBeenCalledWith(true)
      })
    })

    describe('sign up', () => {
      test('expect clicking sign up invokes Authenticator', async () => {
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const chooseButton = (await screen.findByText(/Sign up/i, { selector: 'button' })) as HTMLButtonElement
        await act(async () => {
          chooseButton.click()
        })

        expect(mockSetAuthState).toHaveBeenCalledWith('signUp')
        expect(mockSetShowLogin).toHaveBeenCalledWith(true)
      })
    })
  })

  describe('signed in', () => {
    const choicesPage2 = [
      {
        name: 'White Castle',
        photos: ['https://lh3.googleusercontent.com/places/WhiteCastle'],
        priceLevel: 1,
        rating: 1,
        vicinity: '3401 Clark Lane, Columbia',
      },
    ]
    const statusPage2 = { ...session, status: { ...statusDeciding, pageId: 2 } }

    beforeAll(() => {
      mocked(Auth).currentAuthenticatedUser.mockResolvedValue(user)
    })

    describe('deciding', () => {
      test('expect first place shown when signed in', async () => {
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        expect(await screen.findByText(/Columbia, MO 65203, USA/i)).toBeInTheDocument()
        expect(await screen.findByText(/Shakespeare's Pizza - Downtown/i)).toBeInTheDocument()
        expect(mocked(sessionService).fetchDecision).toHaveBeenCalledWith('aeio', '+15551234567')
      })

      test('expect second place shown when yes vote', async () => {
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const yesButton = (await screen.findByText(/Sounds good/i)) as HTMLButtonElement
        await act(async () => {
          yesButton.click()
        })

        expect(await screen.findByText(/Columbia, MO 65203, USA/i)).toBeInTheDocument()
        expect(await screen.findByText(/Subway/i)).toBeInTheDocument()
      })

      test('expect second place shown when no vote', async () => {
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const noButton = (await screen.findByText(/Maybe later/i)) as HTMLButtonElement
        await act(async () => {
          noButton.click()
        })

        expect(await screen.findByText(/Columbia, MO 65203, USA/i)).toBeInTheDocument()
        expect(await screen.findByText(/Subway/i)).toBeInTheDocument()
      })

      test('expect second place shown when first in decisions', async () => {
        mocked(sessionService).fetchDecision.mockResolvedValueOnce({ decisions: { [choices[0].name]: true } })
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        expect(await screen.findByText(/Columbia, MO 65203, USA/i)).toBeInTheDocument()
        expect(await screen.findByText(/Subway/i)).toBeInTheDocument()
      })

      test('expect second page fetched when last choice in decisions', async () => {
        mocked(sessionService).fetchDecision.mockResolvedValueOnce({ decisions: { [choices[1].name]: true } })
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const yesButton = (await screen.findByText(/Sounds good/i)) as HTMLButtonElement
        await act(async () => {
          yesButton.click()
        })
        mocked(sessionService).fetchSession.mockResolvedValueOnce(statusPage2)
        mocked(mapsService).fetchChoices.mockResolvedValueOnce(choicesPage2)

        expect(await screen.findByText(/Columbia, MO 65203, USA/i)).toBeInTheDocument()
        expect(await screen.findByText(/White Castle/i)).toBeInTheDocument()
      })

      test('expect vote results passed to PATCH endpoint', async () => {
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const yesButton = (await screen.findByText(/Sounds good/i)) as HTMLButtonElement
        await act(async () => {
          yesButton.click()
        })
        await screen.findByText(/Subway/i)
        const noButton = (await screen.findByText(/Maybe later/i)) as HTMLButtonElement
        await act(async () => {
          noButton.click()
        })

        expect(mocked(sessionService).updateDecisions).toHaveBeenCalledWith('aeio', '+15551234567', [
          { op: 'add', path: "/decisions/Shakespeare's Pizza - Downtown", value: true },
          { op: 'add', path: '/decisions/Subway', value: false },
        ])
      })
    })

    describe('choices', () => {
      test('expect no place picture shows RestaurantIcon', async () => {
        mocked(mapsService).fetchChoices.mockResolvedValueOnce([placeNoPic])
        mocked(sessionService).fetchDecision.mockResolvedValue({ decisions: {} })
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        expect(await screen.findByTitle(/Restaurant icon/i)).toBeInTheDocument()
      })

      test('expect waiting for voters message when choices exhausted', async () => {
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const yesButton = (await screen.findByText(/Sounds good/i)) as HTMLButtonElement
        await act(async () => {
          yesButton.click()
        })
        await screen.findByText(/Subway/i)
        const noButton = (await screen.findByText(/Maybe later/i)) as HTMLButtonElement
        await act(async () => {
          noButton.click()
        })

        expect(await screen.findByText(/Waiting for other voters/i)).toBeInTheDocument()
      })

      test('expect refresh when refreshes exhausted', async () => {
        render(
          <VoteSession
            maxStatusRefreshCount={0}
            sessionId={sessionId}
            setAuthState={mockSetAuthState}
            setShowLogin={mockSetShowLogin}
          />
        )

        const yesButton = (await screen.findByText(/Sounds good/i)) as HTMLButtonElement
        await act(async () => {
          yesButton.click()
        })
        await screen.findByText(/Subway/i)
        const noButton = (await screen.findByText(/Maybe later/i)) as HTMLButtonElement
        await act(async () => {
          noButton.click()
        })

        expect(await screen.findByText(/Please refresh the page/i)).toBeInTheDocument()
      })

      test('expect second set of choices displayed when first exhausted', async () => {
        mocked(mapsService).fetchChoices.mockResolvedValueOnce(choices)
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const yesButton = (await screen.findByText(/Sounds good/i)) as HTMLButtonElement
        await act(async () => {
          yesButton.click()
        })
        mocked(sessionService).fetchSession.mockResolvedValueOnce(statusPage2)
        mocked(mapsService).fetchChoices.mockResolvedValueOnce(choicesPage2)
        await screen.findByText(/Subway/i)
        const noButton = (await screen.findByText(/Maybe later/i)) as HTMLButtonElement
        await act(async () => {
          noButton.click()
        })

        expect(await screen.findByText(/Columbia, MO 65203, USA/i)).toBeInTheDocument()
        expect(await screen.findByText(/White Castle/i)).toBeInTheDocument()
      })

      test('expect finished message when all choices exhausted', async () => {
        mocked(mapsService).fetchChoices.mockResolvedValueOnce(choices)
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const yesButton = (await screen.findByText(/Sounds good/i)) as HTMLButtonElement
        await act(async () => {
          yesButton.click()
        })
        mocked(sessionService).fetchSession.mockResolvedValueOnce({
          ...session,
          status: { ...statusDeciding, current: 'finished' },
        })
        await screen.findByText(/Subway/i)
        const noButton = (await screen.findByText(/Maybe later/i)) as HTMLButtonElement
        await act(async () => {
          noButton.click()
        })

        expect(await screen.findByText(/Choices exhausted/i)).toBeInTheDocument()
      })

      test('expect make new choices navigates', async () => {
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)
        mocked(sessionService).fetchSession.mockResolvedValueOnce({
          ...session,
          status: { ...statusDeciding, current: 'finished' },
        })

        const newChoicesButton = (await screen.findByText(/Make new choices/i)) as HTMLButtonElement
        act(() => {
          newChoicesButton.click()
        })

        expect(mocked(gatsby).navigate).toHaveBeenCalledWith('/')
      })
    })

    describe('owner', () => {
      test('expect correct URL shown when logged in', async () => {
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const urlInput: HTMLInputElement = (await screen.findByLabelText(/Session URL/i)) as HTMLInputElement
        await waitFor(() => {
          expect(urlInput.value).toEqual('https://dbowland.com/s/aeio')
        })
      })

      test('expect owner section not shown to non-owner', async () => {
        mocked(Auth).currentAuthenticatedUser.mockResolvedValueOnce({ ...user, attributes: { sub: 'another-user' } })
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        expect(screen.queryByLabelText(/Session URL/i)).not.toBeInTheDocument()
      })

      test('expect copy invokes writeText and displays message', async () => {
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const copyLinkButton = (await screen.findByText(/Copy session URL/i, {
          selector: 'button',
        })) as HTMLButtonElement
        act(() => {
          copyLinkButton.click()
        })

        expect(mockCopyToClipboard).toHaveBeenCalled()
        expect(await screen.findByText(/Link copied to clipboard/i)).toBeInTheDocument()
      })

      test('expect closing copy success message removes it', async () => {
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const copyLinkButton = (await screen.findByText(/Copy session URL/i, {
          selector: 'button',
        })) as HTMLButtonElement
        act(() => {
          copyLinkButton.click()
        })
        const closeSnackbarButton = (await screen.findByLabelText(/Close/i, {
          selector: 'button',
        })) as HTMLButtonElement
        act(() => {
          closeSnackbarButton.click()
        })

        expect(screen.queryByText(/Link copied to clipboard/i)).not.toBeInTheDocument()
      })

      test('expect copy throw displays error', async () => {
        mockCopyToClipboard.mockImplementationOnce(() => {
          throw new Error('A wild error appeared')
        })
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const copyLinkButton = (await screen.findByText(/Copy session URL/i, {
          selector: 'button',
        })) as HTMLButtonElement
        act(() => {
          copyLinkButton.click()
        })

        expect(mockCopyToClipboard).toHaveBeenCalled()
        expect(await screen.findByText(/Could not copy link to clipboard/i)).toBeInTheDocument()
      })

      test('expect closing error message removes it', async () => {
        mockCopyToClipboard.mockImplementationOnce(() => {
          throw new Error('A wild error appeared')
        })
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const copyLinkButton = (await screen.findByText(/Copy session URL/i, {
          selector: 'button',
        })) as HTMLButtonElement
        act(() => {
          copyLinkButton.click()
        })
        const closeSnackbarButton = (await screen.findByLabelText(/Close/i, {
          selector: 'button',
        })) as HTMLButtonElement
        act(() => {
          closeSnackbarButton.click()
        })

        expect(screen.queryByText(/Could not copy link to clipboard/i)).not.toBeInTheDocument()
      })

      test('expect updateSession invoked with patched Session', async () => {
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const pagesSliderInput = (await screen.findByLabelText(/Max votes per round/i)) as HTMLInputElement
        await act(async () => {
          fireEvent.change(pagesSliderInput, { target: { value: 60 } })
        })
        const voterSliderInput = (await screen.findByLabelText(/Number of voters/i)) as HTMLInputElement
        await act(async () => {
          fireEvent.change(voterSliderInput, { target: { value: 4 } })
        })
        const updateButton = (await screen.findByText(/Update vote options/i, {
          selector: 'button',
        })) as HTMLButtonElement
        await act(async () => {
          updateButton.click()
        })

        expect(mocked(sessionService).updateSession).toHaveBeenCalledWith(sessionId, [
          { op: 'test', path: '/voterCount', value: 2 },
          { op: 'replace', path: '/voterCount', value: 4 },
          { op: 'test', path: '/pagesPerRound', value: 1 },
          { op: 'replace', path: '/pagesPerRound', value: 3 },
        ])
      })

      test('expect error message when updateSession rejects', async () => {
        mocked(sessionService).updateSession.mockRejectedValueOnce(undefined)
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const updateButton = (await screen.findByText(/Update vote options/i, {
          selector: 'button',
        })) as HTMLButtonElement
        await act(async () => {
          updateButton.click()
        })

        expect(await screen.findByText(/Error updating vote session/i)).toBeInTheDocument()
      })
    })

    describe('winner', () => {
      test('expect winner message when winner selected', async () => {
        mocked(mapsService).fetchChoices.mockResolvedValueOnce(choices)
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const yesButton = (await screen.findByText(/Sounds good/i)) as HTMLButtonElement
        await act(async () => {
          yesButton.click()
        })
        mocked(sessionService).fetchSession.mockResolvedValueOnce({
          ...session,
          status: {
            ...statusDeciding,
            current: 'winner',
            winner: placeDetails,
          },
        })
        await screen.findByText(/Subway/i)
        const noButton = (await screen.findByText(/Maybe later/i)) as HTMLButtonElement
        await act(async () => {
          noButton.click()
        })

        await waitFor(async () => {
          expect(await screen.findByText(/The winning decision is/i)).toBeInTheDocument()
        })
        expect(await screen.findByText(/Dave's Place/i)).toBeInTheDocument()
      })

      test('expect no winner picture shows RestaurantIcon', async () => {
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)
        mocked(sessionService).fetchSession.mockResolvedValueOnce({
          ...session,
          status: {
            ...statusDeciding,
            current: 'winner',
            winner: placeNoPic,
          },
        })

        expect(await screen.findByTitle(/Restaurant icon/i)).toBeInTheDocument()
      })

      test('expect make new choices navigates', async () => {
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)
        mocked(sessionService).fetchSession.mockResolvedValueOnce({
          ...session,
          status: {
            ...statusDeciding,
            current: 'winner',
            winner: place,
          },
        })

        const newChoicesButton = (await screen.findByText(/Make new choices/i)) as HTMLButtonElement
        await act(async () => {
          newChoicesButton.click()
        })

        expect(mocked(gatsby).navigate).toHaveBeenCalledWith('/')
      })
    })

    describe('service errors', () => {
      test('expect error message on bad status', async () => {
        mocked(Auth).currentAuthenticatedUser.mockResolvedValueOnce(user)
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)
        mocked(sessionService).fetchSession.mockResolvedValueOnce({
          ...session,
          status: {
            ...statusDeciding,
            current: 'bad_status',
          },
        } as any)

        await waitFor(async () => {
          expect(await screen.findByText(/An error has occurred/i)).toBeInTheDocument()
        })
      })

      test('expect error message when fetchChoices rejects', async () => {
        mocked(mapsService).fetchChoices.mockRejectedValueOnce(undefined)
        render(<VoteSession sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        expect(await screen.findByText(/Error fetching choices/i)).toBeInTheDocument()
      })
    })
  })
})
