import React from 'react'

import PrivacyLink from './index'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

describe('provacy-link component', () => {
  it('should render privacy link', async () => {
    render(<PrivacyLink />)

    expect(await screen.findByText(/privacy policy/i)).toBeInTheDocument()
  })
})
