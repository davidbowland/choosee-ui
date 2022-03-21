import React from 'react'
import '@testing-library/jest-dom'
import { screen, render } from '@testing-library/react'

import Logo from './index'

describe('Logo component', () => {
  test('expect rendering Logo has title in output', async () => {
    render(<Logo />)

    expect(await screen.getByText('Choosee')).toBeInTheDocument()
  })
})
