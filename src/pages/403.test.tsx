import '@testing-library/jest-dom'
import { render } from '@testing-library/react'
import React from 'react'

import Forbidden, { Head } from './403'
import Authenticated from '@components/auth'
import ServerErrorMessage from '@components/server-error-message'
import Themed from '@components/themed'

jest.mock('@components/auth')
jest.mock('@components/server-error-message')
jest.mock('@components/themed')

describe('403 error page', () => {
  beforeAll(() => {
    jest.mocked(Authenticated).mockImplementation(({ children }) => <>{children}</>)
    jest.mocked(ServerErrorMessage).mockReturnValue(<></>)
    jest.mocked(Themed).mockImplementation(({ children }) => <>{children}</>)
  })

  it('should render Authenticated', () => {
    render(<Forbidden />)
    expect(Authenticated).toHaveBeenCalledTimes(1)
  })

  it('should render ServerErrorMessage', () => {
    const expectedTitle = '403: Forbidden'
    render(<Forbidden />)
    expect(ServerErrorMessage).toHaveBeenCalledWith(
      expect.objectContaining({ title: expectedTitle }),
      expect.anything(),
    )
    expect(ServerErrorMessage).toHaveBeenCalledTimes(1)
  })

  it('should return title in Head component', () => {
    const { container } = render(<Head {...({} as any)} />)
    expect(container).toMatchInlineSnapshot(`
      <div>
        <title>
          403: Forbidden | dbowland.com
        </title>
      </div>
    `)
  })
})
