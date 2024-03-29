import '@testing-library/jest-dom'
import { mocked } from 'jest-mock'
import React from 'react'
import { render } from '@testing-library/react'

import Authenticated from '@components/auth'
import Index from './index'
import PrivacyLink from '@components/privacy-link'
import SessionCreate from '@components/session-create'

jest.mock('@aws-amplify/analytics')
jest.mock('@components/auth')
jest.mock('@components/privacy-link')
jest.mock('@components/session-create')

describe('Index page', () => {
  beforeAll(() => {
    mocked(Authenticated).mockImplementation(({ children }) => <>{children}</>)
    mocked(PrivacyLink).mockReturnValue(<></>)
    mocked(SessionCreate).mockReturnValue(<></>)
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { search: '' },
    })
  })

  beforeEach(() => {
    window.location.search = ''
  })

  test('expect rendering Index renders Authenticated', () => {
    render(<Index />)
    expect(mocked(Authenticated)).toHaveBeenCalledTimes(1)
  })

  test('expect rendering Index renders PrivacyLink', () => {
    render(<Index />)
    expect(mocked(PrivacyLink)).toHaveBeenCalledTimes(1)
  })

  test('expect rendering Index renders SessionCreate', () => {
    render(<Index />)
    expect(mocked(SessionCreate)).toHaveBeenCalledTimes(1)
  })
})
