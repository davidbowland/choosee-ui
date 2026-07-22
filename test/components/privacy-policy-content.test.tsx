import React from 'react'

import PrivacyPolicy from '@components/privacy-policy'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

describe('PrivacyPolicy content', () => {
  it('states that phone numbers are deleted after 180 days', () => {
    render(<PrivacyPolicy />)
    expect(screen.getByText(/180 days/i)).toBeInTheDocument()
  })

  it('describes texting only about rounds in polls you join', () => {
    render(<PrivacyPolicy />)
    expect(screen.getByText(/text you about rounds in Choosee polls you join/i)).toBeInTheDocument()
  })

  it('no longer claims phone numbers last only for the duration of the Choosee', () => {
    render(<PrivacyPolicy />)
    expect(screen.queryByText(/retained only for the duration of the Choosee/i)).not.toBeInTheDocument()
  })
})
