import '@testing-library/jest-dom'
import React from 'react'
import { mocked } from 'jest-mock'
import { render } from '@testing-library/react'

import Authenticated from '@components/auth'
import Session from '@components/session'
import SessionPage from './[sessionId]'
import { sessionId } from '@test/__mocks__'

jest.mock('@aws-amplify/analytics')
jest.mock('@components/auth')
jest.mock('@components/session')

describe('Session page', () => {
  beforeAll(() => {
    mocked(Authenticated).mockImplementation(({ children }): any => children)
    mocked(Session).mockReturnValue(<></>)
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { search: '' },
    })
  })

  beforeEach(() => {
    window.location.search = ''
  })

  test('expect rendering SessionPage renders Authenticated', () => {
    render(<SessionPage params={{ sessionId }} />)
    expect(mocked(Authenticated)).toHaveBeenCalledTimes(1)
  })

  test('expect rendering SessionPage renders Session', () => {
    render(<SessionPage params={{ sessionId }} />)
    expect(mocked(Session)).toBeCalledWith(expect.objectContaining({ sessionId: 'aeio' }), {})
  })

  test('expect "u" query string passed to SessionPage', () => {
    window.location.search = '?u=%2B18005551234'
    render(<SessionPage params={{ sessionId }} />)
    expect(mocked(Session)).toHaveBeenCalledWith(expect.objectContaining({ initialUserId: '+18005551234' }), {})
  })
})
