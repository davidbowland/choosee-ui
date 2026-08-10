import React from 'react'

import { PillArrowButton } from './index'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('PillArrowButton', () => {
  it('renders its label', () => {
    render(<PillArrowButton label="Let's go" onPress={jest.fn()} />)

    expect(screen.getByRole('button', { name: /Let's go/ })).toBeInTheDocument()
  })

  it('swaps to the loading label while loading', () => {
    render(<PillArrowButton isLoading={true} label="Let's go" loadingLabel="Looking…" onPress={jest.fn()} />)

    expect(screen.getByRole('button', { name: /Looking…/ })).toBeInTheDocument()
  })

  it('invokes onPress when pressed', async () => {
    const user = userEvent.setup()
    const onPress = jest.fn()
    render(<PillArrowButton label="Let's go" onPress={onPress} />)

    await user.click(screen.getByRole('button', { name: /Let's go/ }))

    expect(onPress).toHaveBeenCalled()
  })

  it('does not invoke onPress when disabled', async () => {
    const user = userEvent.setup()
    const onPress = jest.fn()
    render(<PillArrowButton isDisabled={true} label="Let's go" onPress={onPress} />)

    await user.click(screen.getByRole('button', { name: /Let's go/ }))

    expect(onPress).not.toHaveBeenCalled()
  })

  // Every existing call site omits `type` and expects a plain button, so the default must not change.
  it('is a plain button by default', () => {
    render(<PillArrowButton label="Let's go" onPress={jest.fn()} />)

    expect(screen.getByRole('button', { name: /Let's go/ })).toHaveAttribute('type', 'button')
  })

  // AC-033: a form cannot be submitted from the keyboard unless its primary control submits it.
  it('submits its form when given the submit type', async () => {
    const user = userEvent.setup()
    const onSubmit = jest.fn((event: React.FormEvent) => event.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <PillArrowButton label="Let's go" onPress={jest.fn()} type="submit" />
      </form>,
    )

    await user.click(screen.getByRole('button', { name: /Let's go/ }))

    expect(onSubmit).toHaveBeenCalled()
  })

  it('submits its form when Enter is pressed in a field', async () => {
    const user = userEvent.setup()
    const onSubmit = jest.fn((event: React.FormEvent) => event.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <input aria-label="Code or link" type="text" />
        <PillArrowButton label="Let's go" onPress={jest.fn()} type="submit" />
      </form>,
    )
    await user.type(screen.getByLabelText('Code or link'), 'lazy giraffe{Enter}')

    expect(onSubmit).toHaveBeenCalled()
  })
})
