import { Button, Spinner } from '@heroui/react'
import { UserPlus } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import React, { useEffect, useRef, useState } from 'react'

export const SectionContainer = ({ children }: { children: React.ReactNode }): React.ReactNode => (
  <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">{children}</div>
)

export const SectionTitle = ({ children }: { children: React.ReactNode }): React.ReactNode => (
  <h2 className="choosee-brand text-3xl text-foreground">{children}</h2>
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
    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-all ${
      checked ? 'border-primary bg-primary/5' : 'border-default-200 hover:border-default-300 hover:bg-default-50'
    }`}
  >
    <input checked={checked} className="accent-primary" name="user-select" onChange={onChange} type="radio" />
    <span className="text-sm font-medium">{label}</span>
  </label>
)

export const CreateNewOption = ({ checked, onChange }: { checked: boolean; onChange: () => void }): React.ReactNode => (
  <label
    className={`flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-3.5 transition-all ${
      checked ? 'border-primary bg-primary/5' : 'border-primary/40 hover:border-primary hover:bg-primary/5'
    }`}
  >
    <input checked={checked} className="accent-primary" name="user-select" onChange={onChange} type="radio" />
    <UserPlus className="h-4 w-4 text-primary" />
    <span className="text-sm font-medium text-primary">New voter</span>
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
  <Button className="w-full" isDisabled={isDisabled || isLoading} onPress={onPress} variant="primary">
    {isLoading && <Spinner color="current" size="sm" />}
    {isLoading ? 'Joining…' : "Let's go"}
  </Button>
)

export const ErrorMessage = ({ message }: { message: string }): React.ReactNode => (
  <p className="text-sm text-danger">{message}</p>
)

export const InviteSection = ({ sessionId }: { sessionId: string }): React.ReactNode => {
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const sessionUrl = `${typeof window === 'undefined' ? '' : window.location.origin}/s/${sessionId}`

  useEffect(() => {
    return () => clearTimeout(copiedTimer.current)
  }, [])

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(sessionUrl)
      clearTimeout(copiedTimer.current)
      setCopied(true)
      copiedTimer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard API unavailable */
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-default-200 p-4">
      <p className="text-sm font-semibold">Invite a new voter</p>
      <p className="text-xs text-default-400">Share this link so others can join the session</p>
      <Button className="w-full" onPress={handleCopy} variant="outline">
        {copied ? 'Copied!' : 'Copy invite link'}
      </Button>
      <div className="flex justify-center rounded-lg bg-white p-3">
        <QRCodeSVG size={128} value={sessionUrl} />
      </div>
    </div>
  )
}
