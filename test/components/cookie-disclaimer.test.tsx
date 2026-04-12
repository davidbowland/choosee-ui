import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Cookies from 'js-cookie'
import React from 'react'

import CookieDisclaimer from '@components/cookie-disclaimer'

describe('CookieDisclaimer', () => {
  beforeEach(() => {
    Cookies.remove('disclaimer_accept')
  })

  it('should render the disclaimer on first visit', () => {
    render(<CookieDisclaimer />)
    expect(screen.getByText('Cookie and Privacy Disclosure')).toBeInTheDocument()
  })

  it('should not render when already dismissed', () => {
    Cookies.set('disclaimer_accept', 'true')
    render(<CookieDisclaimer />)
    expect(screen.queryByText('Cookie and Privacy Disclosure')).not.toBeInTheDocument()
  })

  it('should hide and persist dismissal when accept button is pressed', async () => {
    const user = userEvent.setup()
    render(<CookieDisclaimer />)
    await user.click(screen.getByText('Accept & continue'))
    expect(screen.queryByText('Cookie and Privacy Disclosure')).not.toBeInTheDocument()
    expect(Cookies.get('disclaimer_accept')).toBe('true')
  })

  it('should render a link to the privacy policy', () => {
    render(<CookieDisclaimer />)
    expect(screen.getByRole('link', { name: 'privacy policy' })).toHaveAttribute('href', '/privacy-policy')
  })
})
