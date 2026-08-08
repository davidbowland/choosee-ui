import React from 'react'

import Document from '@pages/_document'
import '@testing-library/jest-dom'
import { render } from '@testing-library/react'

// next/document's Head reads DocumentContext, which only exists inside Next's own renderer.
// Rendering the elements as plain fragments is enough to assert what the markup contains.
jest.mock('next/document', () => ({
  Head: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Html: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Main: () => <div data-testid="main" />,
  NextScript: () => <div data-testid="next-script" />,
}))

describe('_document', () => {
  // The app is unlisted, and robots.txt allows crawling so that crawlers can see this tag.
  // That makes it the only thing keeping the site out of search indexes.
  it('should mark every page noindex, nofollow', () => {
    render(<Document />)

    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
  })
})
