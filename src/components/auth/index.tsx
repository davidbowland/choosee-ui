import { Auth } from 'aws-amplify'
import { Authenticator } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'
import DeleteIcon from '@mui/icons-material/Delete'
import LoginIcon from '@mui/icons-material/Login'
import LogoutIcon from '@mui/icons-material/Logout'
import MenuIcon from '@mui/icons-material/Menu'
import Alert from '@mui/material/Alert'
import AppBar from '@mui/material/AppBar'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import React, { useEffect, useState } from 'react'

import Logo from '@components/logo'
import { SignInButton } from './elements'
import { AuthState, CognitoUserAmplify } from '@types'

export interface AuthenticatedProps {
  children: JSX.Element | JSX.Element[]
  initialAuthState: AuthState
  initialShowLogin: boolean
  setInitialAuthState?: (value: AuthState) => void
  setInitialShowLogin?: (value: boolean) => void
}

const Authenticated = ({
  children,
  initialAuthState,
  initialShowLogin,
  setInitialAuthState,
  setInitialShowLogin,
}: AuthenticatedProps): JSX.Element => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const [authState, setAuthState] = useState<AuthState>(initialAuthState)
  const [loggedInUser, setLoggedInUser] = useState<CognitoUserAmplify | undefined>(undefined)
  const [showDeleteErrorSnackbar, setShowDeleteErrorSnackbar] = useState(false)
  const [showLogin, setShowLogin] = useState(initialShowLogin)

  const openMenu = (event: React.MouseEvent<HTMLElement>): void => {
    setAnchorEl(event.currentTarget)
  }

  const closeMenu = (): void => {
    setAnchorEl(null)
  }

  const snackbarClose = (): void => {
    setShowDeleteErrorSnackbar(false)
  }

  const renderLoggedInBar = (): JSX.Element => {
    return (
      <>
        <IconButton
          aria-controls="menu-appbar"
          aria-haspopup="true"
          aria-label="menu"
          color="inherit"
          edge="start"
          onClick={openMenu}
          size="large"
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>
        <Typography sx={{ flexGrow: 1 }} variant="h6">
          Choosee
        </Typography>
        <Typography component="div">Welcome, {loggedInUser?.attributes?.name}</Typography>
        <Menu
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          id="menu-appbar"
          keepMounted
          onClose={closeMenu}
          open={Boolean(anchorEl)}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem
            onClick={() => {
              Auth.signOut()
              setLoggedInUser(undefined)
            }}
          >
            <LogoutIcon /> Sign out
          </MenuItem>
          <MenuItem
            onClick={() => {
              loggedInUser?.deleteUser((err) => {
                if (err) {
                  setShowDeleteErrorSnackbar(true)
                  console.error(err)
                } else {
                  setLoggedInUser(undefined)
                  Auth.signOut({ global: true })
                }
              })
            }}
          >
            <DeleteIcon /> Delete account
          </MenuItem>
        </Menu>
      </>
    )
  }

  const renderLoggedOutBar = (): JSX.Element => {
    return (
      <>
        <Typography sx={{ flexGrow: 1 }} variant="h6">
          Choosee
        </Typography>
        <SignInButton onClick={() => setShowLogin(true)} startIcon={<LoginIcon />} variant="outlined">
          Sign In
        </SignInButton>
      </>
    )
  }

  const renderAuthenticator = (): JSX.Element => {
    return (
      <main className="main-content">
        <section>
          <Logo />
          <Authenticator initialState={authState} loginMechanisms={['phone_number']} signUpAttributes={['name']}>
            {({ user }) => {
              setLoggedInUser(user)
              return <></>
            }}
          </Authenticator>
          <p style={{ textAlign: 'center' }}>
            <Button onClick={() => setShowLogin(false)} variant="outlined">
              Cancel
            </Button>
          </p>
        </section>
      </main>
    )
  }

  useEffect(() => {
    setAuthState(initialAuthState)
  }, [initialAuthState])

  useEffect(() => {
    if (setInitialAuthState !== undefined) {
      setInitialAuthState(authState)
    }
  }, [authState])

  useEffect(() => {
    setShowLogin(initialShowLogin)
  }, [initialShowLogin])

  useEffect(() => {
    if (setInitialShowLogin !== undefined) {
      setInitialShowLogin(showLogin)
    }
  }, [showLogin])

  useEffect(() => {
    setAnchorEl(null)
    setShowLogin(false)
  }, [loggedInUser])

  // Set user if already logged in
  useEffect(() => {
    Auth.currentAuthenticatedUser()
      .then(setLoggedInUser)
      .catch(() => null)
  }, [])

  return (
    <>
      <AppBar position="static">
        <Toolbar>{loggedInUser ? renderLoggedInBar() : renderLoggedOutBar()}</Toolbar>
      </AppBar>
      {showLogin && !loggedInUser ? renderAuthenticator() : children}
      <Snackbar autoHideDuration={6000} onClose={snackbarClose} open={showDeleteErrorSnackbar}>
        <Alert onClose={snackbarClose} severity="error" sx={{ width: '100%' }}>
          There was a problem deleting your account. Please try again later.
        </Alert>
      </Snackbar>
    </>
  )
}

export default Authenticated
