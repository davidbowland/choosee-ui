import { mocked } from 'jest-mock'
import React from 'react'
import '@testing-library/jest-dom'
import { render } from '@testing-library/react'

import SessionPage from './[sessionId]'
import Session from '@components/session'
import { sessionId } from '@test/__mocks__'

jest.mock('@aws-amplify/analytics')
jest.mock('@components/session')

describe('Session page', () => {
  beforeAll(() => {
    mocked(Session).mockReturnValue(<></>)
  })

  test('expect rendering SessionPage renders Session', () => {
    render(<SessionPage params={{ sessionId }} />)
    expect(mocked(Session)).toBeCalledWith({ sessionId: 'aeio' }, {})
  })
})
