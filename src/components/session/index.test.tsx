import { Auth } from 'aws-amplify'
import * as gatsby from 'gatsby'
import { mocked } from 'jest-mock'
import React from 'react'
import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import Logo from '@components/logo'
import Session from './index'
import * as sessionService from '@services/sessions'
import { choices, decisions, place, placeDetails, sessionId, statusDeciding, user, userId } from '@test/__mocks__'
import { StatusObject } from '@types'

jest.mock('aws-amplify')
jest.mock('@aws-amplify/analytics')
jest.mock('@components/logo')
jest.mock('gatsby')
jest.mock('@services/sessions')

describe('Session component', () => {
  const consoleError = console.error
  const mockSetAuthState = jest.fn()
  const mockSetShowLogin = jest.fn()
  const placeNoPic = { ...placeDetails, pic: undefined }

  beforeAll(() => {
    console.error = jest.fn()

    mocked(Logo).mockReturnValue(<>Logo</>)
    mocked(sessionService).fetchChoices.mockResolvedValue(choices)
    mocked(sessionService).fetchDecisions.mockResolvedValue(decisions)
    mocked(sessionService).fetchStatus.mockResolvedValue(statusDeciding)
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
        render(<Session sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)
        mocked(sessionService).fetchStatus.mockRejectedValueOnce(undefined)

        expect(await screen.findByText(/Session expired/i)).toBeInTheDocument()
      })

      test('expect make new choices navigates', async () => {
        render(<Session sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)
        mocked(sessionService).fetchStatus.mockRejectedValueOnce(undefined)

        const newChoicesButton = (await screen.findByText(/Make new choices/i)) as HTMLButtonElement
        act(() => {
          newChoicesButton.click()
        })

        expect(mocked(gatsby).navigate).toHaveBeenCalledWith('/')
      })
    })

    describe('userId log in', () => {
      test('expect initialUserId sets userId text box', async () => {
        render(<Session sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const userIdInput = (await screen.findByLabelText(/Your phone number/i)) as HTMLInputElement
        expect(userIdInput.value)
      })

      test('expect invalid userId shows value', async () => {
        render(<Session sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const userIdInput = (await screen.findByLabelText(/Your phone number/i)) as HTMLInputElement
        act(() => {
          fireEvent.change(userIdInput, { target: { value: '+1555' } })
        })
        const chooseButton = (await screen.findByText(/Let's choose!/i, { selector: 'button' })) as HTMLButtonElement
        act(() => {
          chooseButton.click()
        })

        expect(await screen.findByText(/Invalid phone number. Be sure to include area code./i)).toBeInTheDocument()
      })

      test('expect valid userId logs in', async () => {
        render(<Session sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const userIdInput = (await screen.findByLabelText(/Your phone number/i)) as HTMLInputElement
        act(() => {
          fireEvent.change(userIdInput, { target: { value: userId } })
        })
        const chooseButton = (await screen.findByText(/Let's choose!/i, { selector: 'button' })) as HTMLButtonElement
        act(() => {
          chooseButton.click()
        })

        expect(await screen.findByText(/90210/i)).toBeInTheDocument()
        expect(await screen.findByText(/Shakespeare's Pizza - Downtown/i)).toBeInTheDocument()
        expect(mocked(sessionService).fetchDecisions).toHaveBeenCalledWith('aeio', '+18005551234')
      })
    })

    describe('sign in', () => {
      test('expect clicking sign in invokes Authenticator', async () => {
        render(<Session sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const chooseButton = (await screen.findByText(/Sign in/i, { selector: 'button' })) as HTMLButtonElement
        act(() => {
          chooseButton.click()
        })

        expect(mockSetAuthState).toHaveBeenCalledWith('signIn')
        expect(mockSetShowLogin).toHaveBeenCalledWith(true)
      })
    })

    describe('sign up', () => {
      test('expect clicking sign up invokes Authenticator', async () => {
        render(<Session sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const chooseButton = (await screen.findByText(/Sign up/i, { selector: 'button' })) as HTMLButtonElement
        act(() => {
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
        pic: 'https://lh3.googleusercontent.com/places/WhiteCastle',
        priceLevel: 1,
        rating: 1,
        vicinity: '3401 Clark Lane, Columbia',
      },
    ]
    const statusPage2 = { ...statusDeciding, pageId: 2 }

    beforeAll(() => {
      mocked(Auth).currentAuthenticatedUser.mockResolvedValue(user)
    })

    describe('deciding', () => {
      test('expect first place shown when signed in', async () => {
        render(<Session sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        expect(await screen.findByText(/90210/i)).toBeInTheDocument()
        expect(await screen.findByText(/Shakespeare's Pizza - Downtown/i)).toBeInTheDocument()
        expect(mocked(sessionService).fetchDecisions).toHaveBeenCalledWith('aeio', '+18005551234')
      })

      test('expect second place shown when yes vote', async () => {
        render(<Session sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const yesButton = (await screen.findByText(/Sounds good/i)) as HTMLButtonElement
        act(() => {
          yesButton.click()
        })

        expect(await screen.findByText(/90210/i)).toBeInTheDocument()
        expect(await screen.findByText(/Subway/i)).toBeInTheDocument()
      })

      test('expect second place shown when no vote', async () => {
        render(<Session sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const noButton = (await screen.findByText(/Maybe later/i)) as HTMLButtonElement
        act(() => {
          noButton.click()
        })

        expect(await screen.findByText(/90210/i)).toBeInTheDocument()
        expect(await screen.findByText(/Subway/i)).toBeInTheDocument()
      })

      test('expect second place shown when first in decisions', async () => {
        mocked(sessionService).fetchDecisions.mockResolvedValueOnce({ [choices[0].name]: true })
        render(<Session sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        expect(await screen.findByText(/90210/i)).toBeInTheDocument()
        expect(await screen.findByText(/Subway/i)).toBeInTheDocument()
      })

      test('expect second page fetched when last choice in decisions', async () => {
        mocked(sessionService).fetchDecisions.mockResolvedValueOnce({ [choices[1].name]: true })
        render(<Session sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const yesButton = (await screen.findByText(/Sounds good/i)) as HTMLButtonElement
        act(() => {
          yesButton.click()
        })
        mocked(sessionService).fetchStatus.mockResolvedValueOnce(statusPage2)
        mocked(sessionService).fetchChoices.mockResolvedValueOnce(choicesPage2)

        expect(await screen.findByText(/90210/i)).toBeInTheDocument()
        expect(await screen.findByText(/White Castle/i)).toBeInTheDocument()
      })

      test('expect vote results passed to PATCH endpoint', async () => {
        render(<Session sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const yesButton = (await screen.findByText(/Sounds good/i)) as HTMLButtonElement
        act(() => {
          yesButton.click()
        })
        await screen.findByText(/Subway/i)
        const noButton = (await screen.findByText(/Maybe later/i)) as HTMLButtonElement
        act(() => {
          noButton.click()
        })

        expect(mocked(sessionService).updateDecisions).toHaveBeenCalledWith('aeio', '+18005551234', [
          { op: 'add', path: "/Shakespeare's Pizza - Downtown", value: true },
          { op: 'add', path: '/Subway', value: false },
        ])
      })
    })

    describe('choices', () => {
      test('expect no place picture shows RestaurantIcon', async () => {
        mocked(sessionService).fetchChoices.mockResolvedValueOnce([placeNoPic])
        mocked(sessionService).fetchDecisions.mockResolvedValue({})
        render(<Session sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        expect(await screen.findByTitle(/Restaurant icon/i)).toBeInTheDocument()
      })

      test('expect waiting for voters message when choices exhausted', async () => {
        render(<Session sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const yesButton = (await screen.findByText(/Sounds good/i)) as HTMLButtonElement
        act(() => {
          yesButton.click()
        })
        await screen.findByText(/Subway/i)
        const noButton = (await screen.findByText(/Maybe later/i)) as HTMLButtonElement
        act(() => {
          noButton.click()
        })

        expect(await screen.findByText(/Waiting for other voters/i)).toBeInTheDocument()
      })

      test('expect second set of choices displayed when first exhausted', async () => {
        mocked(sessionService).fetchChoices.mockResolvedValueOnce(choices)
        render(<Session sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const yesButton = (await screen.findByText(/Sounds good/i)) as HTMLButtonElement
        act(() => {
          yesButton.click()
        })
        mocked(sessionService).fetchStatus.mockResolvedValueOnce(statusPage2)
        mocked(sessionService).fetchChoices.mockResolvedValueOnce(choicesPage2)
        await screen.findByText(/Subway/i)
        const noButton = (await screen.findByText(/Maybe later/i)) as HTMLButtonElement
        act(() => {
          noButton.click()
        })

        expect(await screen.findByText(/90210/i)).toBeInTheDocument()
        expect(await screen.findByText(/White Castle/i)).toBeInTheDocument()
      })

      test('expect finished message when all choices exhausted', async () => {
        mocked(sessionService).fetchChoices.mockResolvedValueOnce(choices)
        render(<Session sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const yesButton = (await screen.findByText(/Sounds good/i)) as HTMLButtonElement
        act(() => {
          yesButton.click()
        })
        mocked(sessionService).fetchStatus.mockResolvedValueOnce({ ...statusDeciding, current: 'finished' })
        await screen.findByText(/Subway/i)
        const noButton = (await screen.findByText(/Maybe later/i)) as HTMLButtonElement
        act(() => {
          noButton.click()
        })

        expect(await screen.findByText(/Choices exhausted/i)).toBeInTheDocument()
      })

      test('expect make new choices navigates', async () => {
        render(<Session sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)
        mocked(sessionService).fetchStatus.mockResolvedValueOnce({ ...statusDeciding, current: 'finished' })

        const newChoicesButton = (await screen.findByText(/Make new choices/i)) as HTMLButtonElement
        act(() => {
          newChoicesButton.click()
        })

        expect(mocked(gatsby).navigate).toHaveBeenCalledWith('/')
      })
    })

    describe('winner', () => {
      test('expect winner message when winner selected', async () => {
        mocked(sessionService).fetchChoices.mockResolvedValueOnce(choices)
        render(<Session sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        const yesButton = (await screen.findByText(/Sounds good/i)) as HTMLButtonElement
        act(() => {
          yesButton.click()
        })
        mocked(sessionService).fetchStatus.mockResolvedValueOnce({
          ...statusDeciding,
          current: 'winner',
          winner: placeDetails,
        })
        await screen.findByText(/Subway/i)
        const noButton = (await screen.findByText(/Maybe later/i)) as HTMLButtonElement
        act(() => {
          noButton.click()
        })

        expect(await screen.findByText(/The winning decision is/i)).toBeInTheDocument()
        expect(await screen.findByText(/Dave's Place/i)).toBeInTheDocument()
      })

      test('expect no winner picture shows RestaurantIcon', async () => {
        render(<Session sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)
        mocked(sessionService).fetchStatus.mockResolvedValueOnce({
          ...statusDeciding,
          current: 'winner',
          winner: placeNoPic,
        })

        expect(await screen.findByTitle(/Restaurant icon/i)).toBeInTheDocument()
      })

      test('expect make new choices navigates', async () => {
        render(<Session sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)
        mocked(sessionService).fetchStatus.mockResolvedValueOnce({
          ...statusDeciding,
          current: 'winner',
          winner: place,
        })

        const newChoicesButton = (await screen.findByText(/Make new choices/i)) as HTMLButtonElement
        act(() => {
          newChoicesButton.click()
        })

        expect(mocked(gatsby).navigate).toHaveBeenCalledWith('/')
      })
    })

    describe('service errors', () => {
      test('expect error message on bad status', async () => {
        mocked(Auth).currentAuthenticatedUser.mockResolvedValueOnce(user)
        render(<Session sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)
        mocked(sessionService).fetchStatus.mockResolvedValueOnce(({
          ...statusDeciding,
          current: 'bad_status',
        } as unknown) as StatusObject)

        await waitFor(async () => {
          expect(await screen.findByText(/An error has occurred/i)).toBeInTheDocument()
        })
      })

      test('expect error message when fetchChoices rejects', async () => {
        mocked(sessionService).fetchChoices.mockRejectedValueOnce(undefined)
        render(<Session sessionId={sessionId} setAuthState={mockSetAuthState} setShowLogin={mockSetShowLogin} />)

        expect(await screen.findByText(/Error fetching choices/i)).toBeInTheDocument()
      })
    })
  })
})
