import '@testing-library/jest-dom'
import { mocked } from 'jest-mock'
import React from 'react'
import { render } from '@testing-library/react'

import Authenticated from '@components/auth'
import PrivacyLink from '@components/privacy-link'
import { sessionId } from '@test/__mocks__'
import SessionPage from './[sessionId]'
import Themed from '@components/themed'
import VoteSession from '@components/session'

jest.mock('@aws-amplify/analytics')
jest.mock('@components/auth')
jest.mock('@components/privacy-link')
jest.mock('@components/session')
jest.mock('@components/themed')

describe('Session page', () => {
  beforeAll(() => {
    mocked(Authenticated).mockImplementation(({ children }): any => children)
    mocked(PrivacyLink).mockReturnValue(<></>)
    mocked(Themed).mockImplementation(({ children }) => <>{children}</>)
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { search: '' },
    })
    mocked(VoteSession).mockReturnValue(<></>)
  })

  beforeEach(() => {
    window.location.search = ''
  })

  test('expect rendering SessionPage renders Authenticated', () => {
    render(<SessionPage params={{ sessionId }} />)
    expect(mocked(Authenticated)).toHaveBeenCalledTimes(1)
  })

  test('expect rendering SessionPage renders PrivacyLink', () => {
    render(<SessionPage params={{ sessionId }} />)
    expect(mocked(PrivacyLink)).toHaveBeenCalledTimes(1)
  })

  test('expect rendering SessionPage renders Session', () => {
    render(<SessionPage params={{ sessionId }} />)
    expect(mocked(VoteSession)).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 'aeio' }), {})
  })

  test('expect "u" query string passed to SessionPage', () => {
    window.location.search = '?u=%2B18005551234'
    render(<SessionPage params={{ sessionId }} />)
    expect(mocked(VoteSession)).toHaveBeenCalledWith(expect.objectContaining({ initialUserId: '+18005551234' }), {})
  })
})
