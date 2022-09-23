import React, { useMemo } from 'react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import useMediaQuery from '@mui/material/useMediaQuery'

import '@config/amplify'
import Disclaimer from '@components/disclaimer'

import '@assets/css/index.css'
import '@fontsource/roboto'

export interface ThemedProps {
  children: JSX.Element | JSX.Element[]
}

const Themed = ({ children }: ThemedProps): JSX.Element => {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: prefersDarkMode ? 'dark' : 'light',
        },
      }),
    [prefersDarkMode]
  )

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
      <Disclaimer />
    </ThemeProvider>
  )
}

export default Themed
