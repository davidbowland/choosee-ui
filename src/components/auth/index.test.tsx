import '@testing-library/jest-dom'
import * as gatsby from 'gatsby'
import { Authenticator, ThemeProvider } from '@aws-amplify/ui-react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Auth } from 'aws-amplify'
import { mocked } from 'jest-mock'
import React from 'react'

import Authenticated from './index'
import { user } from '@test/__mocks__'

jest.mock('aws-amplify')
jest.mock('@aws-amplify/analytics')
jest.mock('@aws-amplify/ui-react')
jest.mock('gatsby')

describe('Authenticated component', () => {
  const authState = 'signIn'
  const mockLocationReload = jest.fn()
  const showLogin = false
  const setInitialAuthState = jest.fn()
  const setInitialShowLogin = jest.fn()

  beforeAll(() => {
    mocked(Auth).signOut.mockResolvedValue({})
    mocked(Authenticator).mockReturnValue(<></>)
    mocked(ThemeProvider).mockImplementation(({ children }) => children as unknown as JSX.Element)

    console.error = jest.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload: mockLocationReload },
    })
  })

  describe('theme', () => {
    beforeAll(() => {
      mocked(Auth).currentAuthenticatedUser.mockRejectedValue(undefined)
    })

    test('expect system color mode', async () => {
      render(
        <Authenticated
          initialAuthState={authState}
          initialShowLogin={showLogin}
          setInitialAuthState={setInitialAuthState}
          setInitialShowLogin={setInitialShowLogin}
        >
          <p>Testing children</p>
        </Authenticated>
      )

      const signInButton = (await screen.findByText(/Sign in/i, { selector: 'button' })) as HTMLButtonElement
      fireEvent.click(signInButton)

      expect(mocked(ThemeProvider)).toHaveBeenCalledWith(
        expect.objectContaining({ colorMode: 'system' }),
        expect.anything()
      )
    })
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
      expect(screen.queryByText(/Cancel/i)).not.toBeInTheDocument()
    })

    test('expect clicking sign in shows authenticator', async () => {
      render(
        <Authenticated
          initialAuthState={authState}
          initialShowLogin={showLogin}
          setInitialAuthState={setInitialAuthState}
          setInitialShowLogin={setInitialShowLogin}
        >
          <p>Testing children</p>
        </Authenticated>
      )
      const signInButton = (await screen.findByText(/Sign in/i, { selector: 'button' })) as HTMLButtonElement
      fireEvent.click(signInButton)

      expect(setInitialShowLogin).toHaveBeenCalledWith(true)
      expect(mocked(Authenticator)).toHaveBeenCalledTimes(1)
      expect(await screen.findByText(/Cancel/i)).toBeInTheDocument()
    })

    test('expect logging in sets the user', async () => {
      const logInCallback = jest.fn()
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      mocked(Authenticator).mockImplementationOnce(({ children }: unknown) => {
        logInCallback.mockImplementation(() => children && children({ signOut: jest.fn(), user }))
        return <></>
      })

      render(
        <Authenticated
          initialAuthState={authState}
          initialShowLogin={showLogin}
          setInitialAuthState={setInitialAuthState}
          setInitialShowLogin={setInitialShowLogin}
        >
          <p>Testing children</p>
        </Authenticated>
      )
      const signInButton = (await screen.findByText(/Sign in/i, { selector: 'button' })) as HTMLButtonElement
      fireEvent.click(signInButton)
      logInCallback()

      expect(mocked(Authenticator)).toHaveBeenCalledTimes(1)
      expect(await screen.findByText(/Dave/i)).toBeInTheDocument()
    })

    test('expect going back from login goes back', async () => {
      render(
        <Authenticated
          initialAuthState={authState}
          initialShowLogin={showLogin}
          setInitialAuthState={setInitialAuthState}
          setInitialShowLogin={setInitialShowLogin}
        >
          <p>Testing children</p>
        </Authenticated>
      )

      const signInButton = (await screen.findByText(/Sign in/i, { selector: 'button' })) as HTMLButtonElement
      fireEvent.click(signInButton)
      const goBackButton = (await screen.findByText(/Cancel/i, { selector: 'button' })) as HTMLButtonElement
      fireEvent.click(goBackButton)

      expect(setInitialShowLogin).toHaveBeenCalledWith(false)
      expect(screen.queryByText(/Cancel/i)).not.toBeInTheDocument()
    })
  })

  describe('signed in', () => {
    beforeAll(() => {
      mocked(Auth).currentAuthenticatedUser.mockResolvedValue(user)
      user.deleteUser = jest.fn().mockImplementation((callback) => callback())
    })

    test('expect user name', async () => {
      render(
        <Authenticated
          initialAuthState={authState}
          initialShowLogin={showLogin}
          setInitialAuthState={setInitialAuthState}
          setInitialShowLogin={setInitialShowLogin}
        >
          <p>Testing children</p>
        </Authenticated>
      )

      expect(await screen.findByText(/Dave/i)).toBeInTheDocument()
    })

    test('expect working menu', async () => {
      render(
        <Authenticated
          initialAuthState={authState}
          initialShowLogin={showLogin}
          setInitialAuthState={setInitialAuthState}
          setInitialShowLogin={setInitialShowLogin}
        >
          <p>Testing children</p>
        </Authenticated>
      )
      const menuButton = (await screen.findByLabelText(/menu/i, { selector: 'button' })) as HTMLButtonElement
      fireEvent.click(menuButton)

      expect(await screen.findByText(/Privacy policy/i)).toBeVisible()
      expect(await screen.findByText(/Sign out/i)).toBeVisible()
      expect(await screen.findByText(/Delete account/i)).toBeVisible()
    })

    test('expect selecting privacy policy navigates', async () => {
      render(
        <Authenticated
          initialAuthState={authState}
          initialShowLogin={showLogin}
          setInitialAuthState={setInitialAuthState}
          setInitialShowLogin={setInitialShowLogin}
        >
          <p>Testing children</p>
        </Authenticated>
      )
      const menuButton = (await screen.findByLabelText(/menu/i, { selector: 'button' })) as HTMLButtonElement
      fireEvent.click(menuButton)
      const privacyPolicyButton = (await screen.findByText(/Privacy policy/i)) as HTMLButtonElement
      fireEvent.click(privacyPolicyButton)

      expect(mocked(gatsby).navigate).toHaveBeenCalledWith('/privacy-policy')
    })

    test('expect selecting sign out signs the user out', async () => {
      render(
        <Authenticated
          initialAuthState={authState}
          initialShowLogin={showLogin}
          setInitialAuthState={setInitialAuthState}
          setInitialShowLogin={setInitialShowLogin}
        >
          <p>Testing children</p>
        </Authenticated>
      )
      const menuButton = (await screen.findByLabelText(/menu/i, { selector: 'button' })) as HTMLButtonElement
      fireEvent.click(menuButton)
      const signOutButton = (await screen.findByText(/Sign out/i)) as HTMLButtonElement
      fireEvent.click(signOutButton)

      expect(user.deleteUser).not.toHaveBeenCalled()
      expect(mocked(Auth).signOut).toHaveBeenCalled()
      expect(await screen.findByText(/Sign in/i)).toBeInTheDocument()
      expect(screen.queryByText(/Dave/i)).not.toBeInTheDocument()
      await waitFor(() => expect(mockLocationReload).toHaveBeenCalled())
    })

    describe('delete account', () => {
      test('expect selecting delete account and then back does not delete account', async () => {
        render(
          <Authenticated
            initialAuthState={authState}
            initialShowLogin={showLogin}
            setInitialAuthState={setInitialAuthState}
            setInitialShowLogin={setInitialShowLogin}
          >
            <p>Testing children</p>
          </Authenticated>
        )
        const menuButton = (await screen.findByLabelText(/menu/i, { selector: 'button' })) as HTMLButtonElement
        fireEvent.click(menuButton)
        const deleteAccountMenuOption = (await screen.findByText(/Delete account/i)) as HTMLButtonElement
        fireEvent.click(deleteAccountMenuOption)
        const goBackButton = (await screen.findByText(/Go back/i)) as HTMLButtonElement
        fireEvent.click(goBackButton)

        expect(user.deleteUser).not.toHaveBeenCalled()
        expect(mocked(Auth).signOut).not.toHaveBeenCalled()
        expect(screen.queryByText(/Sign in/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/Dave/i)).toBeInTheDocument()
        expect(mockLocationReload).not.toHaveBeenCalled()
      })

      test('expect selecting delete account invokes delete function', async () => {
        render(
          <Authenticated
            initialAuthState={authState}
            initialShowLogin={showLogin}
            setInitialAuthState={setInitialAuthState}
            setInitialShowLogin={setInitialShowLogin}
          >
            <p>Testing children</p>
          </Authenticated>
        )
        const menuButton = (await screen.findByLabelText(/menu/i, { selector: 'button' })) as HTMLButtonElement
        fireEvent.click(menuButton)
        const deleteAccountMenuOption = (await screen.findByText(/Delete account/i)) as HTMLButtonElement
        fireEvent.click(deleteAccountMenuOption)
        const continueButton = (await screen.findByText(/Continue/i)) as HTMLButtonElement
        fireEvent.click(continueButton)

        expect(user.deleteUser).toHaveBeenCalled()
        expect(mocked(Auth).signOut).toHaveBeenCalled()
        expect(await screen.findByText(/Sign in/i)).toBeInTheDocument()
        expect(screen.queryByText(/Dave/i)).not.toBeInTheDocument()
        await waitFor(() => expect(mockLocationReload).toHaveBeenCalled())
      })

      test('expect delete account error shows snackbar', async () => {
        mocked(user.deleteUser).mockImplementationOnce((callback) => callback(new Error('Thar be errors here')))

        render(
          <Authenticated
            initialAuthState={authState}
            initialShowLogin={showLogin}
            setInitialAuthState={setInitialAuthState}
            setInitialShowLogin={setInitialShowLogin}
          >
            <p>Testing children</p>
          </Authenticated>
        )
        const menuButton = (await screen.findByLabelText(/menu/i, { selector: 'button' })) as HTMLButtonElement
        fireEvent.click(menuButton)
        const deleteAccountMenuOption = (await screen.findByText(/Delete account/i)) as HTMLButtonElement
        fireEvent.click(deleteAccountMenuOption)
        const continueButton = (await screen.findByText(/Continue/i)) as HTMLButtonElement
        fireEvent.click(continueButton)

        expect(user.deleteUser).toHaveBeenCalled()
        expect(mocked(Auth).signOut).not.toHaveBeenCalled()
        expect(console.error).toHaveBeenCalled()
        expect(await screen.findByText(/There was a problem deleting your account/i)).toBeVisible()
      })

      test('expect closing delete error snackbar removes the text', async () => {
        mocked(user.deleteUser).mockImplementationOnce((callback) => callback(new Error('Thar be errors here')))

        render(
          <Authenticated
            initialAuthState={authState}
            initialShowLogin={showLogin}
            setInitialAuthState={setInitialAuthState}
            setInitialShowLogin={setInitialShowLogin}
          >
            <p>Testing children</p>
          </Authenticated>
        )
        const menuButton = (await screen.findByLabelText(/menu/i, { selector: 'button' })) as HTMLButtonElement
        fireEvent.click(menuButton)
        const deleteAccountMenuOption = (await screen.findByText(/Delete account/i)) as HTMLButtonElement
        fireEvent.click(deleteAccountMenuOption)
        const continueButton = (await screen.findByText(/Continue/i)) as HTMLButtonElement
        fireEvent.click(continueButton)
        const closeSnackbarButton = (await screen.findByLabelText(/Close/i, {
          selector: 'button',
        })) as HTMLButtonElement
        fireEvent.click(closeSnackbarButton)

        expect(await screen.findByText(/There was a problem deleting your account/i)).not.toBeVisible()
      })
    })
  })
})
