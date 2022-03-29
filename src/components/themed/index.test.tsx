import '@testing-library/jest-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { render, screen } from '@testing-library/react'
import CssBaseline from '@mui/material/CssBaseline'
import React from 'react'
import { mocked } from 'jest-mock'
import useMediaQuery from '@mui/material/useMediaQuery'

import Themed from './index'
import { theme } from '@test/__mocks__'

jest.mock('@aws-amplify/analytics')
jest.mock('@mui/material/CssBaseline')
jest.mock('@mui/material/styles', () => ({
  ThemeProvider: jest.fn(),
  createTheme: jest.fn(),
}))
jest.mock('@mui/material/useMediaQuery')

describe('Themed component', () => {
  const children = <>fnord</>

  beforeAll(() => {
    mocked(CssBaseline).mockReturnValue(<></>)
    mocked(ThemeProvider).mockImplementation(({ children }) => <>{children}</>)
    mocked(createTheme).mockReturnValue(theme)
    mocked(useMediaQuery).mockReturnValue(false)
  })

  test('expect rendering Themed has children in output', async () => {
    render(<Themed>{children}</Themed>)

    expect(await screen.findByText('fnord')).toBeInTheDocument()
  })

  test('expect rendering Themed renders CssBaseline', async () => {
    render(<Themed>{children}</Themed>)

    expect(mocked(CssBaseline)).toHaveBeenCalledTimes(1)
  })

  test('expect rendering Themed uses light theme when reqeusted', () => {
    render(<Themed>{children}</Themed>)

    expect(mocked(createTheme)).toHaveBeenCalledWith({ palette: { mode: 'light' } })
    expect(mocked(ThemeProvider)).toHaveBeenCalledWith(expect.objectContaining({ theme }), {})
  })

  test('expect rendering Themed uses dark theme when reqeusted', () => {
    mocked(useMediaQuery).mockReturnValueOnce(true)
    render(<Themed>{children}</Themed>)

    expect(mocked(createTheme)).toHaveBeenCalledWith({ palette: { mode: 'dark' } })
    expect(mocked(ThemeProvider)).toHaveBeenCalledWith(expect.objectContaining({ theme }), {})
  })
})
