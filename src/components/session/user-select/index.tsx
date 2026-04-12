import { useMutation } from '@tanstack/react-query'
import React, { useEffect, useRef, useState } from 'react'

import {
  ConfirmButton,
  CreateNewOption,
  ErrorMessage,
  InviteSection,
  SectionContainer,
  SectionTitle,
  UserOption,
} from './elements'
import { createUser } from '@services/api'
import { User } from '@types'
import { displayName } from '@utils/users'

export interface UserSelectPhaseProps {
  sessionId: string
  users: User[]
  onUserSelected: (userId: string) => void
}

const UserSelectPhase = ({ sessionId, users, onUserSelected }: UserSelectPhaseProps): React.ReactNode => {
  const [selected, setSelected] = useState<string | null>(null)
  const [createNew, setCreateNew] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Prevents double-fire if the component re-renders while the auto-create mutation is in-flight
  const autoCreateFired = useRef(false)

  const createMutation = useMutation({
    mutationFn: () => createUser(sessionId),
    onSuccess: (newUser) => {
      onUserSelected(newUser.userId)
    },
    onError: (err: unknown) => {
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { status?: number; data?: { message?: string } } }).response
        if (response?.status === 400) {
          setError(response.data?.message ?? 'Maximum number of voters reached.')
          return
        }
      }
      setError('Failed to join. Please try again.')
    },
  })

  const isEmpty = users.length === 0
  useEffect(() => {
    if (isEmpty && !autoCreateFired.current) {
      autoCreateFired.current = true
      createMutation.mutate()
    }
  }, [isEmpty]) // eslint-disable-line

  const handleConfirm = (): void => {
    if (createNew) {
      createMutation.mutate()
    } else if (selected) {
      onUserSelected(selected)
    }
  }

  // While auto-creating, show nothing (loading handled by parent)
  if (isEmpty) return null

  return (
    <SectionContainer>
      <SectionTitle>{users.length === 1 ? 'Welcome back' : 'Returning voter? Select your profile'}</SectionTitle>

      <div className="flex flex-col gap-2">
        <CreateNewOption
          checked={createNew}
          onChange={() => {
            setCreateNew(true)
            setSelected(null)
          }}
        />
        {users.map((user) => (
          <UserOption
            checked={!createNew && selected === user.userId}
            key={user.userId}
            label={displayName(user)}
            onChange={() => {
              setSelected(user.userId)
              setCreateNew(false)
            }}
          />
        ))}
      </div>

      {error && <ErrorMessage message={error} />}

      <ConfirmButton
        isDisabled={!createNew && !selected}
        isLoading={createMutation.isPending}
        onPress={handleConfirm}
      />

      <InviteSection sessionId={sessionId} />
    </SectionContainer>
  )
}

export default UserSelectPhase
