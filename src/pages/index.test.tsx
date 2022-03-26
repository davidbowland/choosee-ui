import '@testing-library/jest-dom'
import React from 'react'
import { mocked } from 'jest-mock'
import { render } from '@testing-library/react'

import Authenticated from '@components/auth'
import Index from './index'
import SessionCreate from '@components/session-create'

jest.mock('@aws-amplify/analytics')
jest.mock('@components/auth')
jest.mock('@components/session-create')

describe('Index page', () => {
  beforeAll(() => {
    mocked(Authenticated).mockImplementation(({ children }) => <>{children}</>)
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

  test('expect rendering Index renders SessionCreate', () => {
    render(<Index />)
    expect(mocked(SessionCreate)).toHaveBeenCalledTimes(1)
  })
})
