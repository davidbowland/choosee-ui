import Disclaimer from '@components/disclaimer'
import { theme } from '@test/__mocks__'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import React from 'react'

import CssBaseline from '@mui/material/CssBaseline'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'

import Themed from './index'

jest.mock('@aws-amplify/analytics')
jest.mock('@mui/material/CssBaseline')
jest.mock('@mui/material/styles', () => ({
  createTheme: jest.fn(),
  ThemeProvider: jest.fn(),
}))
jest.mock('@mui/material/useMediaQuery')
jest.mock('@components/disclaimer')

describe('Themed component', () => {
  const children = <>fnord</>

  beforeAll(() => {
    jest.mocked(CssBaseline).mockReturnValue(<></>)
    jest.mocked(Disclaimer).mockReturnValue(<></>)
    jest.mocked(ThemeProvider).mockImplementation(({ children }) => <>{children}</>)
    jest.mocked(createTheme).mockReturnValue(theme)
    jest.mocked(useMediaQuery).mockReturnValue(false)
  })

  it('should render children', async () => {
    render(<Themed>{children}</Themed>)

    expect(await screen.findByText('fnord')).toBeInTheDocument()
  })

  it('should render CssBaseline', async () => {
    render(<Themed>{children}</Themed>)

    expect(CssBaseline).toHaveBeenCalledTimes(1)
  })

  it('should render Disclaimer', async () => {
    render(<Themed>{children}</Themed>)

    expect(Disclaimer).toHaveBeenCalledTimes(1)
  })

  it('should use light theme by default', () => {
    render(<Themed>{children}</Themed>)

    expect(createTheme).toHaveBeenCalledWith({
      palette: {
        background: {
          default: '#ededed',
          paper: '#fff',
        },
        mode: 'light',
      },
    })
    expect(ThemeProvider).toHaveBeenCalledWith(expect.objectContaining({ theme }), {})
  })

  it('should use dark theme when preferred by system', () => {
    jest.mocked(useMediaQuery).mockReturnValueOnce(true)
    render(<Themed>{children}</Themed>)

    expect(createTheme).toHaveBeenCalledWith({
      palette: {
        background: {
          default: '#121212',
          paper: '#121212',
        },
        mode: 'dark',
      },
    })
    expect(ThemeProvider).toHaveBeenCalledWith(expect.objectContaining({ theme }), {})
  })
})
