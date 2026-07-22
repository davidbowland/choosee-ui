import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// @ts-expect-error — mock-only export from __mocks__/index.tsx
import { mockSetAuthState } from '@components/auth-context'
import { useProfile } from '@hooks/useProfile'
import * as api from '@services/api'
import { renderHook, waitFor } from '@testing-library/react'

jest.mock('@components/auth-context')
jest.mock('@services/api')

const wrapper = (client: QueryClient) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  Wrapper.displayName = 'QueryWrapper'
  return Wrapper
}

const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

describe('useProfile', () => {
  beforeAll(() => {
    jest.mocked(api.fetchProfile).mockResolvedValue({ verified: true, phoneLast4: '4567', consent: true })
  })

  it('does not fetch when signed out', () => {
    mockSetAuthState({ isSignedIn: false })
    renderHook(() => useProfile(), { wrapper: wrapper(newClient()) })
    expect(api.fetchProfile).not.toHaveBeenCalled()
  })

  it('fetches and returns the profile when signed in', async () => {
    mockSetAuthState({ isSignedIn: true })
    const { result } = renderHook(() => useProfile(), { wrapper: wrapper(newClient()) })
    await waitFor(() => expect(result.current.profile).toEqual({ verified: true, phoneLast4: '4567', consent: true }))
  })

  it('setProfile updates the cached value synchronously', async () => {
    mockSetAuthState({ isSignedIn: true })
    const { result } = renderHook(() => useProfile(), { wrapper: wrapper(newClient()) })
    await waitFor(() => expect(result.current.profile).toBeDefined())
    result.current.setProfile({ verified: false, phoneLast4: '9999', consent: true })
    await waitFor(() => expect(result.current.profile).toEqual({ verified: false, phoneLast4: '9999', consent: true }))
  })
})
