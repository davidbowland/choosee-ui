import React, { useState } from 'react'
import AccountCircleRoundedIcon from '@mui/icons-material/AccountCircleRounded'
import Alert from '@mui/material/Alert'
import { Auth } from 'aws-amplify'
import Box from '@mui/material/Box'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import DeleteIcon from '@mui/icons-material/Delete'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import { Link } from 'gatsby'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import LogoutIcon from '@mui/icons-material/Logout'
import Snackbar from '@mui/material/Snackbar'
import SwipeableDrawer from '@mui/material/SwipeableDrawer'
import Typography from '@mui/material/Typography'

import { CognitoUserAmplify } from '@types'

export interface LoggedInBarProps {
  loggedInUser?: CognitoUserAmplify
  setLoggedInUser: (user: CognitoUserAmplify | undefined) => void
}

const LoggedInBar = ({ loggedInUser, setLoggedInUser }: LoggedInBarProps): JSX.Element => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [showDeleteErrorSnackbar, setShowDeleteErrorSnackbar] = useState(false)

  const closeMenu = (): void => {
    setIsDrawerOpen(false)
  }

  const openMenu = (): void => {
    setIsDrawerOpen(true)
  }

  const snackbarClose = (): void => {
    setShowDeleteErrorSnackbar(false)
  }

  return (
    <>
      <Typography sx={{ flexGrow: 1 }} variant="h6">
        <Link style={{ color: '#fff', textDecoration: 'none' }} to="/">
          Choosee
        </Link>
      </Typography>
      <Typography component="div">Welcome, {loggedInUser?.attributes?.name}</Typography>
      <IconButton
        aria-controls="menu-appbar"
        aria-haspopup="true"
        aria-label="menu"
        color="inherit"
        edge="start"
        onClick={openMenu}
        size="large"
        sx={{ ml: 0.5 }}
      >
        <AccountCircleRoundedIcon />
      </IconButton>
      <SwipeableDrawer anchor="right" onClose={closeMenu} onOpen={openMenu} open={isDrawerOpen}>
        <Box onClick={closeMenu} role="presentation" sx={{ width: 250 }}>
          <List>
            <ListItem
              button
              onClick={() => {
                closeMenu()
                setLoggedInUser(undefined)
                Auth.signOut().then(() => window.location.reload())
              }}
            >
              <ListItemIcon>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="Sign out" />
            </ListItem>
          </List>
          <List>
            <ListItem button>
              <ListItemIcon>
                <CloseRoundedIcon />
              </ListItemIcon>
              <ListItemText primary="Close" />
            </ListItem>
          </List>
          <Divider />
          <List>
            <ListItem
              button
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
              <ListItemIcon>
                <DeleteIcon />
              </ListItemIcon>
              <ListItemText primary="Delete account" />
            </ListItem>
          </List>
        </Box>
      </SwipeableDrawer>
      <Snackbar autoHideDuration={6000} onClose={snackbarClose} open={showDeleteErrorSnackbar}>
        <Alert onClose={snackbarClose} severity="error" sx={{ width: '100%' }}>
          There was a problem deleting your account. Please try again later.
        </Alert>
      </Snackbar>
    </>
  )
}

export default LoggedInBar
