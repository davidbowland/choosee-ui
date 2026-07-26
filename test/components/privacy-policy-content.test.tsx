import React from 'react'

import PrivacyPolicy from '@components/privacy-policy'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

describe('PrivacyPolicy content', () => {
  it('describes emailing only about rounds in polls you join', () => {
    render(<PrivacyPolicy />)
    expect(screen.getByText(/email you about rounds in Choosee polls you join/i)).toBeInTheDocument()
  })

  // Storage is NOT conditional on the toggle: post-user writes the address at join for any
  // signed-in user. The policy must describe that, not the narrower claim it once made.
  it('states that a signed-in address is stored and deleted with the Choosee regardless of reminders', () => {
    render(<PrivacyPolicy />)
    expect(screen.getByText(/whether or not you turn on reminders/i)).toBeInTheDocument()
  })

  it('states that sending is what requires turning reminders on', () => {
    render(<PrivacyPolicy />)
    expect(
      screen.getByText(/only send you email when you turn on round reminders, and only because you asked us to/i),
    ).toBeInTheDocument()
  })

  // Guards against reintroducing SMS copy: there is no STOP keyword and no unsubscribe
  // control for email, so any such promise would describe a capability we do not offer.
  it('makes no SMS-era promises', () => {
    render(<PrivacyPolicy />)
    expect(screen.queryByText(/replying STOP/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/text you/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/phone number/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/180 days/i)).not.toBeInTheDocument()
  })
})
