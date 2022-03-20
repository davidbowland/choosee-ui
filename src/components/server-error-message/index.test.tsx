import React from 'react'
import '@testing-library/jest-dom'
import { screen, render } from '@testing-library/react'

import ServerErrorMessage from './index'

describe('ServerErrorMessage component', () => {
  const title = 'server-error-message'
  const children = 'Nothing to see here'

  test('expect rendering ServerErrorMessage has title in output', () => {
    render(<ServerErrorMessage title={title}> </ServerErrorMessage>)

    expect(screen.getByText(title)).toBeInTheDocument()
  })

  test('expect rendering ServerErrorMessage contains passed children in output', () => {
    render(<ServerErrorMessage title={title}>{children}</ServerErrorMessage>)

    expect(screen.getByText(children, { exact: false })).toBeInTheDocument()
  })

  test('expect rendering ServerErrorMessage has link to home', () => {
    render(<ServerErrorMessage title={title}> </ServerErrorMessage>)

    const anchors = screen.getAllByRole('link') as HTMLAnchorElement[]
    expect(anchors.filter((link) => new URL(link.href).pathname === '/').length).toBe(1)
  })
})
