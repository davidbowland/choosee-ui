import { mocked } from 'jest-mock'
import React from 'react'
import '@testing-library/jest-dom'
import { render } from '@testing-library/react'

import Index from './index'
import Authenticated from '@components/auth'
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
    expect(mocked(Authenticated)).toHaveBeenCalled()
  })

  test('expect rendering Index renders SessionCreate', () => {
    render(<Index />)
    expect(mocked(SessionCreate)).toHaveBeenCalledTimes(1)
  })
})
