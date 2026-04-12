import InternalServerError from '@pages/500'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import React from 'react'

import AppBar from '@components/app-bar'

jest.mock('@components/app-bar')

describe('500 error page', () => {
  beforeAll(() => {
    jest.mocked(AppBar).mockReturnValue(<nav data-testid="app-bar" />)
  })

  it('should render AppBar', () => {
    render(<InternalServerError />)
    expect(AppBar).toHaveBeenCalled()
  })

  it('should render heading', () => {
    render(<InternalServerError />)
    expect(screen.getByRole('heading', { name: /500: internal server error/i })).toBeInTheDocument()
  })

  it('should render error message', () => {
    render(<InternalServerError />)
    expect(screen.getByText(/internal server error has occurred/i)).toBeInTheDocument()
  })

  it('should render a link to home', () => {
    render(<InternalServerError />)
    expect(screen.getByRole('link', { name: /go home/i })).toHaveAttribute('href', '/')
  })
})
