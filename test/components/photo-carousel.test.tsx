import React from 'react'

import PhotoCarousel from '@components/photo-carousel'
import '@testing-library/jest-dom'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Embla mock that exposes select/reInit listeners so we can exercise onSelect + onThumbClick
let selectCb: (() => void) | null = null
let reInitCb: (() => void) | null = null

const mockMainApi: {
  selectedScrollSnap: jest.Mock
  scrollTo: jest.Mock
  on: jest.Mock
  off: jest.Mock
} = {
  selectedScrollSnap: jest.fn(() => 0),
  scrollTo: jest.fn(),
  on: jest.fn((event: string, cb: () => void) => {
    if (event === 'select') selectCb = cb
    if (event === 'reInit') reInitCb = cb
    return mockMainApi
  }),
  off: jest.fn(() => mockMainApi),
}

const mockThumbsApi = {
  scrollTo: jest.fn(),
}

jest.mock('embla-carousel-react', () => ({
  __esModule: true,
  default: jest.fn((opts?: Record<string, unknown>) => {
    if (opts && opts.dragFree) {
      return [React.createRef(), mockThumbsApi]
    }
    return [React.createRef(), mockMainApi]
  }),
}))

const images = [
  { src: 'https://example.com/1.jpg', alt: 'Photo 1 of 3' },
  { src: 'https://example.com/2.jpg', alt: 'Photo 2 of 3' },
  { src: 'https://example.com/3.jpg', alt: 'Photo 3 of 3' },
]

describe('PhotoCarousel', () => {
  /** Rewires the Embla mock to a freshly-mounted carousel sitting on the first slide. */
  const setup = (): void => {
    selectCb = null
    reInitCb = null
    mockMainApi.selectedScrollSnap.mockReturnValue(0)
  }

  it('should render all main images', () => {
    setup()
    render(<PhotoCarousel images={images} />)
    const namedImgs = screen.getAllByRole('img').filter((img) => img.getAttribute('alt') !== '')
    expect(namedImgs).toHaveLength(3)
    expect(namedImgs[0]).toHaveAttribute('src', 'https://example.com/1.jpg')
    expect(namedImgs[2]).toHaveAttribute('src', 'https://example.com/3.jpg')
  })

  it('should render thumbnail buttons for each image', () => {
    setup()
    render(<PhotoCarousel images={images} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(3)
    expect(buttons[0]).toHaveAttribute('aria-label', 'Photo 1 of 3')
    expect(buttons[2]).toHaveAttribute('aria-label', 'Photo 3 of 3')
  })

  it('should mark thumbnail images as decorative', () => {
    setup()
    const { container } = render(<PhotoCarousel images={images} />)
    const thumbImgs = container.querySelectorAll('button img')
    thumbImgs.forEach((img) => expect(img).toHaveAttribute('alt', ''))
  })

  it('should mark the first thumbnail as current by default', () => {
    setup()
    render(<PhotoCarousel images={images} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toHaveAttribute('aria-current', 'true')
    expect(buttons[1]).toHaveAttribute('aria-current', 'false')
  })

  it('should scroll to the clicked thumbnail index', async () => {
    setup()
    const user = userEvent.setup()
    render(<PhotoCarousel images={images} />)
    const buttons = screen.getAllByRole('button')
    await user.click(buttons[1])
    expect(mockMainApi.scrollTo).toHaveBeenCalledWith(1)
  })

  it('should move the current thumbnail on a select event', () => {
    setup()
    render(<PhotoCarousel images={images} />)
    mockMainApi.selectedScrollSnap.mockReturnValue(2)
    act(() => {
      selectCb?.()
    })
    const buttons = screen.getAllByRole('button')
    expect(buttons[2]).toHaveAttribute('aria-current', 'true')
    expect(buttons[0]).toHaveAttribute('aria-current', 'false')
  })

  it('should sync thumbs on reInit event', () => {
    setup()
    render(<PhotoCarousel images={images} />)
    mockMainApi.selectedScrollSnap.mockReturnValue(1)
    act(() => {
      reInitCb?.()
    })
    expect(mockThumbsApi.scrollTo).toHaveBeenCalledWith(1)
  })

  it('should render dot indicators when showThumbnails is false', () => {
    setup()
    render(<PhotoCarousel images={images} showThumbnails={false} />)
    const allButtons = screen.getAllByRole('button')
    const dots = allButtons.filter((btn) => btn.getAttribute('aria-label')?.startsWith('Photo'))
    expect(dots).toHaveLength(3)
    expect(dots[0]).toHaveAttribute('aria-label', 'Photo 1')
  })

  it('should not render dots when showThumbnails is false and only one image', () => {
    setup()
    render(<PhotoCarousel images={[images[0]]} showThumbnails={false} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('should render overlay when provided', () => {
    setup()
    render(<PhotoCarousel images={images} overlay={<span>Overlay</span>} />)
    expect(screen.getByText('Overlay')).toBeInTheDocument()
  })

  it('should scroll to dot index when clicked', async () => {
    setup()
    const user = userEvent.setup()
    render(<PhotoCarousel images={images} showThumbnails={false} />)
    const allButtons = screen.getAllByRole('button')
    const dots = allButtons.filter((btn) => btn.getAttribute('aria-label')?.startsWith('Photo'))
    await user.click(dots[2])
    expect(mockMainApi.scrollTo).toHaveBeenCalledWith(2)
  })

  describe('with null embla API', () => {
    const useEmblaCarousel = jest.mocked(require('embla-carousel-react').default)

    afterAll(() => {
      useEmblaCarousel.mockImplementation((opts?: Record<string, unknown>) => {
        if (opts && opts.dragFree) return [React.createRef(), mockThumbsApi]
        return [React.createRef(), mockMainApi]
      })
    })

    it('should render without crashing', () => {
      useEmblaCarousel.mockImplementation(() => [React.createRef(), null])
      render(<PhotoCarousel images={images} />)
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(3)
    })
  })
})
