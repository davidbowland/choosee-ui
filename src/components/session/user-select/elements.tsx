import { UserPlus } from 'lucide-react'
import React from 'react'

import { PillArrowButton } from '@components/pill-arrow-button'
import Share from '@components/share'

export const SectionContainer = ({ children }: { children: React.ReactNode }): React.ReactNode => (
  <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">{children}</div>
)

export const SectionTitle = ({ children }: { children: React.ReactNode }): React.ReactNode => (
  <h2 className="choosee-brand text-3xl text-[#F5F5F5]">{children}</h2>
)

export const UserOption = ({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: () => void
}): React.ReactNode => (
  <label
    className={`flex cursor-pointer items-center gap-3 rounded-[12px] border p-3.5 transition-all ${
      checked
        ? 'border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.07)]'
        : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.04]'
    }`}
  >
    <input checked={checked} className="accent-[#F59E0B]" name="user-select" onChange={onChange} type="radio" />
    <span className="text-sm font-medium text-[#D4D4D4]">{label}</span>
  </label>
)

export const CreateNewOption = ({ checked, onChange }: { checked: boolean; onChange: () => void }): React.ReactNode => (
  <label
    className={`flex cursor-pointer items-center gap-3 rounded-[12px] border border-dashed p-3.5 transition-all ${
      checked
        ? 'border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.07)]'
        : 'border-[rgba(245,158,11,0.2)] hover:border-[rgba(245,158,11,0.4)] hover:bg-[rgba(245,158,11,0.05)]'
    }`}
  >
    <input checked={checked} className="accent-[#F59E0B]" name="user-select" onChange={onChange} type="radio" />
    <UserPlus className="h-4 w-4 text-[#F59E0B]" />
    <span className="text-sm font-medium text-[#F59E0B]">I&apos;m new</span>
  </label>
)

export const ConfirmButton = ({
  isDisabled,
  isLoading,
  onPress,
}: {
  isDisabled: boolean
  isLoading: boolean
  onPress: () => void
}): React.ReactNode => (
  <PillArrowButton
    isDisabled={isDisabled}
    isLoading={isLoading}
    label="Let's go"
    loadingLabel="Joining…"
    onPress={onPress}
  />
)

export const ErrorMessage = ({ message }: { message: string }): React.ReactNode => (
  <p className="text-sm text-red-400">{message}</p>
)

// A quiet secondary affordance — "Let's go" is the only primary action on this screen.
export const InviteSection = ({ sessionId }: { sessionId: string }): React.ReactNode => (
  <div className="flex flex-col items-center gap-2 pt-1">
    <p className="text-xs text-[#4B5563]">Invite someone else</p>
    <Share sessionId={sessionId} />
  </div>
)
