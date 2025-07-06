import Authenticated from '@components/auth'
import PrivacyLink from '@components/privacy-link'
import SessionCreate from '@components/session-create'
import '@testing-library/jest-dom'
import { render } from '@testing-library/react'
import React from 'react'

import Index, { Head } from './index'

jest.mock('@aws-amplify/analytics')
jest.mock('@components/auth')
jest.mock('@components/privacy-link')
jest.mock('@components/session-create')

describe('Index page', () => {
  beforeAll(() => {
    jest.mocked(Authenticated).mockImplementation(({ children }) => <>{children}</>)
    jest.mocked(PrivacyLink).mockReturnValue(<></>)
    jest.mocked(SessionCreate).mockReturnValue(<></>)
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { search: '' },
    })
  })

  beforeEach(() => {
    window.location.search = ''
  })

  it('should render Authenticated', () => {
    render(<Index />)
    expect(Authenticated).toHaveBeenCalledTimes(1)
  })

  it('should render PrivacyLink', () => {
    render(<Index />)
    expect(PrivacyLink).toHaveBeenCalledTimes(1)
  })

  it('should render SessionCreate', () => {
    render(<Index />)
    expect(SessionCreate).toHaveBeenCalledTimes(1)
  })

  it('should return title in Head component', () => {
    const { container } = render(<Head {...({} as any)} />)
    expect(container).toMatchInlineSnapshot(`
      <div>
        <title>
          Choosee | dbowland.com
        </title>
      </div>
    `)
  })
})
