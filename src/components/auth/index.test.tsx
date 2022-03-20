import { Auth } from 'aws-amplify'
import { Authenticator } from '@aws-amplify/ui-react'
import { mocked } from 'jest-mock'
import React from 'react'
import '@testing-library/jest-dom'
import { act, screen, render } from '@testing-library/react'

import { user } from '@test/__mocks__'
import Authenticated from './index'

jest.mock('aws-amplify')
jest.mock('@aws-amplify/analytics')
jest.mock('@aws-amplify/ui-react')

describe('Authenticated component', () => {
  const authState = 'signIn'
  const consoleError = console.error
  const showLogin = false

  beforeAll(() => {
    mocked(Authenticator).mockImplementation(() => <></>)
    console.error = jest.fn()
  })

  afterAll(() => {
    console.error = consoleError
  })

  describe('signed out', () => {
    beforeAll(() => {
      mocked(Auth).currentAuthenticatedUser.mockRejectedValue(undefined)
    })

    test('expect title, sign in, and children', async () => {
      render(
        <Authenticated initialAuthState={authState} initialShowLogin={showLogin}>
          <p>Testing children</p>
        </Authenticated>
      )

      expect(await screen.findByText(/Testing children/i)).toBeInTheDocument()
      expect(await screen.findByText(/Choosee/i)).toBeInTheDocument()
      expect(await screen.findByText(/Sign In/i)).toBeInTheDocument()
      expect(() => screen.getByText(/Cancel/i)).toThrow()
    })

    test('expect clicking sign in shows authenticator', async () => {
      render(
        <Authenticated initialAuthState={authState} initialShowLogin={showLogin}>
          <p>Testing children</p>
        </Authenticated>
      )
      const signInButton = (await screen.findByText(/Sign in/i, { selector: 'button' })) as HTMLButtonElement
      act(() => {
        signInButton.click()
      })

      expect(mocked(Authenticator)).toHaveBeenCalled()
      expect(await screen.findByText(/Cancel/i)).toBeInTheDocument()
    })

    test('expect logging in sets the user', async () => {
      const logInCallback = jest.fn()
      mocked(Authenticator).mockImplementationOnce(({ children }) => {
        logInCallback.mockImplementation(() => children && children({ user, signOut: jest.fn() }))
        return <></>
      })

      render(
        <Authenticated initialAuthState={authState} initialShowLogin={showLogin}>
          <p>Testing children</p>
        </Authenticated>
      )
      const signInButton = (await screen.findByText(/Sign in/i, { selector: 'button' })) as HTMLButtonElement
      act(() => {
        signInButton.click()
      })
      act(() => {
        logInCallback()
      })

      expect(mocked(Authenticator)).toHaveBeenCalled()
      expect(await screen.findByText(/Welcome, Steve/i)).toBeInTheDocument()
    })

    test('expect going back from login goes back', async () => {
      render(
        <Authenticated initialAuthState={authState} initialShowLogin={showLogin}>
          <p>Testing children</p>
        </Authenticated>
      )

      const signInButton = (await screen.findByText(/Sign in/i, { selector: 'button' })) as HTMLButtonElement
      act(() => {
        signInButton.click()
      })
      const goBackButton = (await screen.findByText(/Cancel/i, { selector: 'button' })) as HTMLButtonElement
      act(() => {
        goBackButton.click()
      })

      expect(() => screen.getByText(/Cancel/i)).toThrow()
    })
  })

  describe('signed in', () => {
    beforeAll(() => {
      mocked(Auth).currentAuthenticatedUser.mockResolvedValue(user)
      user.deleteUser = jest.fn().mockImplementation((callback) => callback())
    })

    test('expect welcome message', async () => {
      render(
        <Authenticated initialAuthState={authState} initialShowLogin={showLogin}>
          <p>Testing children</p>
        </Authenticated>
      )

      expect(await screen.findByText(/Welcome, Steve/i)).toBeInTheDocument()
    })

    test('expect working menu', async () => {
      render(
        <Authenticated initialAuthState={authState} initialShowLogin={showLogin}>
          <p>Testing children</p>
        </Authenticated>
      )
      const menuButton = (await screen.findByLabelText(/menu/i, { selector: 'button' })) as HTMLButtonElement
      act(() => {
        menuButton.click()
      })

      expect(await screen.findByText(/Sign out/i)).toBeVisible()
      expect(await screen.findByText(/Delete account/i)).toBeVisible()
    })

    test('expect menu closes successfully', async () => {
      render(
        <Authenticated initialAuthState={authState} initialShowLogin={showLogin}>
          <p>Testing children</p>
        </Authenticated>
      )
      const menuButton = (await screen.findByLabelText(/menu/i, { selector: 'button' })) as HTMLButtonElement
      act(() => {
        menuButton.click()
      })
      const menuBackdrop = screen.getByRole('presentation').firstChild as HTMLElement
      act(() => {
        menuBackdrop.click()
      })

      expect(await screen.findByText(/Sign out/i)).not.toBeVisible()
      expect(await screen.findByText(/Delete account/i)).not.toBeVisible()
    })

    test('expect selecting sign out signs the user out', async () => {
      render(
        <Authenticated initialAuthState={authState} initialShowLogin={showLogin}>
          <p>Testing children</p>
        </Authenticated>
      )
      const menuButton = (await screen.findByLabelText(/menu/i, { selector: 'button' })) as HTMLButtonElement
      act(() => {
        menuButton.click()
      })
      const signOutButton = (await screen.findByText(/Sign out/i)) as HTMLButtonElement
      act(() => {
        signOutButton.click()
      })

      expect(user.deleteUser).not.toHaveBeenCalled()
      expect(mocked(Auth).signOut).toHaveBeenCalled()
      expect(await screen.findByText(/Sign in/i)).toBeInTheDocument()
      expect(() => screen.getByText(/Welcome, Steve/i)).toThrow()
    })

    test('expect selecting delete account invokes delete function', async () => {
      render(
        <Authenticated initialAuthState={authState} initialShowLogin={showLogin}>
          <p>Testing children</p>
        </Authenticated>
      )
      const menuButton = (await screen.findByLabelText(/menu/i, { selector: 'button' })) as HTMLButtonElement
      act(() => {
        menuButton.click()
      })
      const deleteAccountMenuOption = (await screen.findByText(/Delete account/i)) as HTMLButtonElement
      act(() => {
        deleteAccountMenuOption.click()
      })

      expect(user.deleteUser).toHaveBeenCalled()
      expect(mocked(Auth).signOut).toHaveBeenCalled()
      expect(await screen.findByText(/Sign in/i)).toBeInTheDocument()
      expect(() => screen.getByText(/Welcome, Steve/i)).toThrow()
    })

    test('expect delete account error shows snackbar', async () => {
      ;(user.deleteUser as jest.Mock).mockImplementationOnce((callback) => callback('Thar be errors here'))

      render(
        <Authenticated initialAuthState={authState} initialShowLogin={showLogin}>
          <p>Testing children</p>
        </Authenticated>
      )
      const menuButton = (await screen.findByLabelText(/menu/i, { selector: 'button' })) as HTMLButtonElement
      act(() => {
        menuButton.click()
      })
      const deleteAccountMenuOption = (await screen.findByText(/Delete account/i)) as HTMLButtonElement
      act(() => {
        deleteAccountMenuOption.click()
      })

      expect(user.deleteUser).toHaveBeenCalled()
      expect(mocked(Auth).signOut).not.toHaveBeenCalled()
      expect(console.error).toHaveBeenCalled()
      expect(await screen.findByText(/There was a problem deleting your account/i)).toBeVisible()
    })

    test('expect closing delete error snackbar removes the text', async () => {
      ;(user.deleteUser as jest.Mock).mockImplementationOnce((callback) => callback('Thar be errors here'))

      render(
        <Authenticated initialAuthState={authState} initialShowLogin={showLogin}>
          <p>Testing children</p>
        </Authenticated>
      )
      const menuButton = (await screen.findByLabelText(/menu/i, { selector: 'button' })) as HTMLButtonElement
      act(() => {
        menuButton.click()
      })
      const deleteAccountMenuOption = (await screen.findByText(/Delete account/i)) as HTMLButtonElement
      act(() => {
        deleteAccountMenuOption.click()
      })
      const closeSnackbarButton = (await screen.findByLabelText(/Close/i, { selector: 'button' })) as HTMLButtonElement
      act(() => {
        closeSnackbarButton.click()
      })

      expect(await screen.findByText(/There was a problem deleting your account/i)).not.toBeVisible()
    })
  })
})
