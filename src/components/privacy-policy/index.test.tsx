import React from 'react'

import PrivacyPolicy from './index'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

describe('privacy-policy component', () => {
  const setup = (): void => {
    render(<PrivacyPolicy />)
  }

  it('should render the privacy policy heading', () => {
    setup()

    expect(screen.getByRole('heading', { level: 1, name: /privacy policy/i })).toBeVisible()
  })

  it.each([
    'What We Collect',
    'Why We Collect It',
    "What We Don't Do",
    'When We Share Your Data',
    'Your Rights',
    'Data Retention',
    'Age',
    'Changes',
    'Contact',
  ])('should render the %s section', (title) => {
    setup()

    expect(screen.getByRole('heading', { level: 2, name: title })).toBeVisible()
  })

  it('should link to the Google privacy policy', () => {
    setup()

    expect(screen.getByRole('link', { name: 'policies.google.com/privacy' })).toHaveAttribute(
      'href',
      'https://policies.google.com/privacy',
    )
  })

  it('should link to the privacy contact address', () => {
    setup()

    expect(screen.getAllByRole('link', { name: 'privacy@dbowland.com' })[0]).toHaveAttribute(
      'href',
      'mailto:privacy@dbowland.com',
    )
  })

  it('should link back to the app', () => {
    setup()

    expect(screen.getByRole('link', { name: /Back to Choosee/i })).toHaveAttribute('href', '/')
  })
})
