import { sessionId } from '@test/__mocks__'
import '@testing-library/jest-dom'
import { render } from '@testing-library/react'
import React from 'react'

import SessionPage, { Head } from './[sessionId]'
import Authenticated from '@components/auth'
import PrivacyLink from '@components/privacy-link'
import VoteSession from '@components/session'
import Themed from '@components/themed'

jest.mock('@components/auth')
jest.mock('@components/privacy-link')
jest.mock('@components/session')
jest.mock('@components/themed')

describe('Session page', () => {
  beforeAll(() => {
    jest.mocked(Authenticated).mockImplementation(({ children }): any => children)
    jest.mocked(PrivacyLink).mockReturnValue(<></>)
    jest.mocked(Themed).mockImplementation(({ children }) => <>{children}</>)
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { search: '' },
    })
    jest.mocked(VoteSession).mockReturnValue(<></>)
  })

  beforeEach(() => {
    window.location.search = ''
  })

  it('should render Authenticated', () => {
    render(<SessionPage params={{ sessionId }} />)
    expect(Authenticated).toHaveBeenCalledTimes(1)
  })

  it('should render PrivacyLink', () => {
    render(<SessionPage params={{ sessionId }} />)
    expect(PrivacyLink).toHaveBeenCalledTimes(1)
  })

  it('should render Session', () => {
    render(<SessionPage params={{ sessionId }} />)
    expect(VoteSession).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 'aeio' }), {})
  })

  it('should pass "u" query string to SessionPage', () => {
    window.location.search = '?u=%2B18005551234'
    render(<SessionPage params={{ sessionId }} />)
    expect(VoteSession).toHaveBeenCalledWith(expect.objectContaining({ initialUserId: '+18005551234' }), {})
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
