import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { useAuthContext } from '@components/auth-context'
import { fetchProfile } from '@services/api'
import { Profile } from '@types'

export interface UseProfileReturn {
  profile: Profile | undefined
  isLoading: boolean
  setProfile: (p: Profile) => void
}

export const useProfile = (): UseProfileReturn => {
  const { isSignedIn } = useAuthContext()
  const queryClient = useQueryClient()

  const query = useQuery<Profile>({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    enabled: isSignedIn,
    staleTime: 30_000,
  })

  const setProfile = useCallback((p: Profile) => queryClient.setQueryData<Profile>(['profile'], p), [queryClient])

  return { profile: query.data, isLoading: query.isLoading, setProfile }
}
