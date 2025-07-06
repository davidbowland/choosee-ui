import { Authenticator, ThemeProvider } from '@aws-amplify/ui-react'
import { user as mockUser } from '@test/__mocks__'
import '@testing-library/jest-dom'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Auth } from 'aws-amplify'
import * as gatsby from 'gatsby'
import React from 'react'

import Authenticated from './index'

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
    jest.mocked(Auth).signOut.mockResolvedValue({})
    jest.mocked(Authenticator).mockReturnValue(<></>)
    jest.mocked(ThemeProvider).mockImplementation(({ children }) => children as unknown as JSX.Element)

    console.error = jest.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload: mockLocationReload },
    })
  })

  describe('theme', () => {
    beforeAll(() => {
      jest.mocked(Auth).currentAuthenticatedUser.mockRejectedValue(undefined)
    })

    it('should use system color mode', async () => {
      render(
        <Authenticated
          initialAuthState={authState}
          initialShowLogin={showLogin}
          setInitialAuthState={setInitialAuthState}
          setInitialShowLogin={setInitialShowLogin}
        >
          <p>Testing children</p>
        </Authenticated>,
      )

      const user = userEvent.setup()
      const signInButton = (await screen.findByText(/Sign in/i, { selector: 'button' })) as HTMLButtonElement
      await act(async () => {
        await user.click(signInButton)
      })

      expect(ThemeProvider).toHaveBeenCalledWith(expect.objectContaining({ colorMode: 'system' }), expect.anything())
    })
  })

  describe('signed out', () => {
    beforeAll(() => {
      jest.mocked(Auth).currentAuthenticatedUser.mockRejectedValue(undefined)
    })

    it('should render title, sign in button, and children', async () => {
      render(
        <Authenticated initialAuthState={authState} initialShowLogin={showLogin}>
          <p>Testing children</p>
        </Authenticated>,
      )

      expect(await screen.findByText(/Testing children/i)).toBeInTheDocument()
      expect(await screen.findByText(/Choosee/i)).toBeInTheDocument()
      expect(await screen.findByText(/Sign In/i)).toBeInTheDocument()
      expect(screen.queryByText(/Cancel/i)).not.toBeInTheDocument()
    })

    it('should show authenticator when sign in is clicked', async () => {
      render(
        <Authenticated
          initialAuthState={authState}
          initialShowLogin={showLogin}
          setInitialAuthState={setInitialAuthState}
          setInitialShowLogin={setInitialShowLogin}
        >
          <p>Testing children</p>
        </Authenticated>,
      )

      const user = userEvent.setup()
      const signInButton = (await screen.findByText(/Sign in/i, { selector: 'button' })) as HTMLButtonElement
      await act(async () => {
        await user.click(signInButton)
      })

      expect(setInitialShowLogin).toHaveBeenCalledWith(true)
      expect(Authenticator).toHaveBeenCalledTimes(1)
      expect(await screen.findByText(/Cancel/i)).toBeInTheDocument()
    })

    it('should set the user when logging in', async () => {
      const logInCallback = jest.fn()
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      jest.mocked(Authenticator).mockImplementationOnce(({ children }: unknown) => {
        logInCallback.mockImplementation(() => children && children({ signOut: jest.fn(), user: mockUser }))
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
        </Authenticated>,
      )

      const user = userEvent.setup()
      const signInButton = (await screen.findByText(/Sign in/i, { selector: 'button' })) as HTMLButtonElement
      await act(async () => {
        await user.click(signInButton)
      })

      await act(() => {
        logInCallback()
        return Promise.resolve()
      })

      expect(Authenticator).toHaveBeenCalledTimes(1)
      expect(await screen.findByText(/Dave/i)).toBeInTheDocument()
    })

    it('should go back when cancel button is clicked', async () => {
      render(
        <Authenticated
          initialAuthState={authState}
          initialShowLogin={showLogin}
          setInitialAuthState={setInitialAuthState}
          setInitialShowLogin={setInitialShowLogin}
        >
          <p>Testing children</p>
        </Authenticated>,
      )

      const user = userEvent.setup()
      const signInButton = (await screen.findByText(/Sign in/i, { selector: 'button' })) as HTMLButtonElement
      await act(async () => {
        await user.click(signInButton)
      })

      const goBackButton = (await screen.findByText(/Cancel/i, { selector: 'button' })) as HTMLButtonElement
      await act(async () => {
        await user.click(goBackButton)
      })

      expect(setInitialShowLogin).toHaveBeenCalledWith(false)
      expect(screen.queryByText(/Cancel/i)).not.toBeInTheDocument()
    })
  })

  describe('signed in', () => {
    beforeAll(() => {
      jest.mocked(Auth).currentAuthenticatedUser.mockResolvedValue(mockUser)
      mockUser.deleteUser = jest.fn().mockImplementation((callback) => callback())
    })

    it('should display user name', async () => {
      render(
        <Authenticated
          initialAuthState={authState}
          initialShowLogin={showLogin}
          setInitialAuthState={setInitialAuthState}
          setInitialShowLogin={setInitialShowLogin}
        >
          <p>Testing children</p>
        </Authenticated>,
      )

      expect(await screen.findByText(/Dave/i)).toBeInTheDocument()
    })

    it('should show menu options when menu is clicked', async () => {
      render(
        <Authenticated
          initialAuthState={authState}
          initialShowLogin={showLogin}
          setInitialAuthState={setInitialAuthState}
          setInitialShowLogin={setInitialShowLogin}
        >
          <p>Testing children</p>
        </Authenticated>,
      )

      const user = userEvent.setup()
      const menuButton = (await screen.findByLabelText(/menu/i, { selector: 'button' })) as HTMLButtonElement
      await act(async () => {
        await user.click(menuButton)
      })

      expect(await screen.findByText(/Privacy policy/i)).toBeVisible()
      expect(await screen.findByText(/Sign out/i)).toBeVisible()
      expect(await screen.findByText(/Delete account/i)).toBeVisible()
    })

    it('should navigate when privacy policy is selected', async () => {
      render(
        <Authenticated
          initialAuthState={authState}
          initialShowLogin={showLogin}
          setInitialAuthState={setInitialAuthState}
          setInitialShowLogin={setInitialShowLogin}
        >
          <p>Testing children</p>
        </Authenticated>,
      )

      const user = userEvent.setup()
      const menuButton = (await screen.findByLabelText(/menu/i, { selector: 'button' })) as HTMLButtonElement
      await act(async () => {
        await user.click(menuButton)
      })

      const privacyPolicyButton = (await screen.findByText(/Privacy policy/i)) as HTMLButtonElement
      await act(async () => {
        await user.click(privacyPolicyButton)
      })

      expect(gatsby.navigate).toHaveBeenCalledWith('/privacy-policy')
    })

    it('should sign out the user when sign out is selected', async () => {
      render(
        <Authenticated
          initialAuthState={authState}
          initialShowLogin={showLogin}
          setInitialAuthState={setInitialAuthState}
          setInitialShowLogin={setInitialShowLogin}
        >
          <p>Testing children</p>
        </Authenticated>,
      )

      const user = userEvent.setup()
      const menuButton = (await screen.findByLabelText(/menu/i, { selector: 'button' })) as HTMLButtonElement
      await act(async () => {
        await user.click(menuButton)
      })

      const signOutButton = (await screen.findByText(/Sign out/i)) as HTMLButtonElement
      await act(async () => {
        await user.click(signOutButton)
      })

      expect(mockUser.deleteUser).not.toHaveBeenCalled()
      expect(Auth.signOut).toHaveBeenCalled()
      expect(await screen.findByText(/Sign in/i)).toBeInTheDocument()
      expect(screen.queryByText(/Dave/i)).not.toBeInTheDocument()
      await waitFor(() => expect(mockLocationReload).toHaveBeenCalled())
    })

    describe('delete account', () => {
      it('should not delete account when going back from delete confirmation', async () => {
        render(
          <Authenticated
            initialAuthState={authState}
            initialShowLogin={showLogin}
            setInitialAuthState={setInitialAuthState}
            setInitialShowLogin={setInitialShowLogin}
          >
            <p>Testing children</p>
          </Authenticated>,
        )

        const user = userEvent.setup()
        const menuButton = (await screen.findByLabelText(/menu/i, { selector: 'button' })) as HTMLButtonElement
        await act(async () => {
          await user.click(menuButton)
        })

        const deleteAccountMenuOption = (await screen.findByText(/Delete account/i)) as HTMLButtonElement
        await act(async () => {
          await user.click(deleteAccountMenuOption)
        })

        const goBackButton = (await screen.findByText(/Go back/i)) as HTMLButtonElement
        await act(async () => {
          await user.click(goBackButton)
        })

        expect(mockUser.deleteUser).not.toHaveBeenCalled()
        expect(Auth.signOut).not.toHaveBeenCalled()
        expect(screen.queryByText(/Sign in/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/Dave/i)).toBeInTheDocument()
        expect(mockLocationReload).not.toHaveBeenCalled()
      })

      it('should invoke delete function when delete account is confirmed', async () => {
        render(
          <Authenticated
            initialAuthState={authState}
            initialShowLogin={showLogin}
            setInitialAuthState={setInitialAuthState}
            setInitialShowLogin={setInitialShowLogin}
          >
            <p>Testing children</p>
          </Authenticated>,
        )

        const user = userEvent.setup()
        const menuButton = (await screen.findByLabelText(/menu/i, { selector: 'button' })) as HTMLButtonElement
        await act(async () => {
          await user.click(menuButton)
        })

        const deleteAccountMenuOption = (await screen.findByText(/Delete account/i)) as HTMLButtonElement
        await act(async () => {
          await user.click(deleteAccountMenuOption)
        })

        const continueButton = (await screen.findByText(/Continue/i)) as HTMLButtonElement
        await act(async () => {
          await user.click(continueButton)
        })

        expect(mockUser.deleteUser).toHaveBeenCalled()
        expect(Auth.signOut).toHaveBeenCalled()
        expect(await screen.findByText(/Sign in/i)).toBeInTheDocument()
        expect(screen.queryByText(/Dave/i)).not.toBeInTheDocument()
        await waitFor(() => expect(mockLocationReload).toHaveBeenCalled())
      })

      it('should show snackbar when delete account fails', async () => {
        jest
          .mocked(mockUser.deleteUser)
          .mockImplementationOnce((callback) => callback(new Error('Thar be errors here')))

        render(
          <Authenticated
            initialAuthState={authState}
            initialShowLogin={showLogin}
            setInitialAuthState={setInitialAuthState}
            setInitialShowLogin={setInitialShowLogin}
          >
            <p>Testing children</p>
          </Authenticated>,
        )

        const user = userEvent.setup()
        const menuButton = (await screen.findByLabelText(/menu/i, { selector: 'button' })) as HTMLButtonElement
        await act(async () => {
          await user.click(menuButton)
        })

        const deleteAccountMenuOption = (await screen.findByText(/Delete account/i)) as HTMLButtonElement
        await act(async () => {
          await user.click(deleteAccountMenuOption)
        })

        const continueButton = (await screen.findByText(/Continue/i)) as HTMLButtonElement
        await act(async () => {
          await user.click(continueButton)
        })

        expect(mockUser.deleteUser).toHaveBeenCalled()
        expect(Auth.signOut).not.toHaveBeenCalled()
        expect(console.error).toHaveBeenCalled()
        expect(await screen.findByText(/There was a problem deleting your account/i)).toBeVisible()
      })

      it('should remove error message when snackbar is closed', async () => {
        jest
          .mocked(mockUser.deleteUser)
          .mockImplementationOnce((callback) => callback(new Error('Thar be errors here')))

        render(
          <Authenticated
            initialAuthState={authState}
            initialShowLogin={showLogin}
            setInitialAuthState={setInitialAuthState}
            setInitialShowLogin={setInitialShowLogin}
          >
            <p>Testing children</p>
          </Authenticated>,
        )

        const user = userEvent.setup()
        const menuButton = (await screen.findByLabelText(/menu/i, { selector: 'button' })) as HTMLButtonElement
        await act(async () => {
          await user.click(menuButton)
        })

        const deleteAccountMenuOption = (await screen.findByText(/Delete account/i)) as HTMLButtonElement
        await act(async () => {
          await user.click(deleteAccountMenuOption)
        })

        const continueButton = (await screen.findByText(/Continue/i)) as HTMLButtonElement
        await act(async () => {
          await user.click(continueButton)
        })

        const closeSnackbarButton = (await screen.findByLabelText(/Close/i, {
          selector: 'button',
        })) as HTMLButtonElement
        await act(async () => {
          await user.click(closeSnackbarButton)
        })

        expect(await screen.findByText(/There was a problem deleting your account/i)).not.toBeVisible()
      })
    })
  })
})
