import React, { useState } from 'react'
import Alert from '@mui/material/Alert'
import { Auth } from 'aws-amplify'
import DeleteIcon from '@mui/icons-material/Delete'
import IconButton from '@mui/material/IconButton'
import { Link } from 'gatsby'
import LogoutIcon from '@mui/icons-material/Logout'
import Menu from '@mui/material/Menu'
import MenuIcon from '@mui/icons-material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import Typography from '@mui/material/Typography'

import { CognitoUserAmplify } from '@types'

export interface LoggedInBarProps {
  loggedInUser?: CognitoUserAmplify
  setLoggedInUser: (user: CognitoUserAmplify | undefined) => void
}

const LoggedInBar = ({ loggedInUser, setLoggedInUser }: LoggedInBarProps): JSX.Element => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [showDeleteErrorSnackbar, setShowDeleteErrorSnackbar] = useState(false)

  const closeMenu = (): void => {
    setAnchorEl(null)
  }

  const openMenu = (event: React.MouseEvent<HTMLElement>): void => {
    setAnchorEl(event.currentTarget)
  }

  const snackbarClose = (): void => {
    setShowDeleteErrorSnackbar(false)
  }

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
        <Link style={{ color: '#fff', textDecoration: 'none' }} to="/">
          Choosee
        </Link>
      </Typography>
      <Typography component="div">Welcome, {loggedInUser?.attributes?.name}</Typography>
      <Menu
        anchorEl={anchorEl}
        anchorOrigin={{
          horizontal: 'right',
          vertical: 'top',
        }}
        id="menu-appbar"
        keepMounted
        onClose={closeMenu}
        open={Boolean(anchorEl)}
        transformOrigin={{
          horizontal: 'right',
          vertical: 'top',
        }}
      >
        <MenuItem
          onClick={() => {
            closeMenu()
            setLoggedInUser(undefined)
            Auth.signOut().then(() => window.location.reload())
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
                closeMenu()
                setLoggedInUser(undefined)
                Auth.signOut({ global: true }).then(() => window.location.reload())
              }
            })
          }}
        >
          <DeleteIcon /> Delete account
        </MenuItem>
      </Menu>
      <Snackbar autoHideDuration={6000} onClose={snackbarClose} open={showDeleteErrorSnackbar}>
        <Alert onClose={snackbarClose} severity="error" sx={{ width: '100%' }}>
          There was a problem deleting your account. Please try again later.
        </Alert>
      </Snackbar>
    </>
  )
}

export default LoggedInBar
