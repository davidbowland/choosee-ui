import { Alert, AlertDescription, AlertRoot } from '@heroui/react'
import { Users } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

export const ErrorBanner = ({ message }: { message: string }): React.ReactNode => (
  <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-6">
    <AlertRoot status="danger">
      <Alert>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </AlertRoot>
    <Link className="text-primary underline" href="/">
      Go back home
    </Link>
  </div>
)

export const SoloVoterHint = (): React.ReactNode => (
  <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-600 dark:text-warning-400">
    <Users className="h-4 w-4 flex-shrink-0" />
    <span>You&apos;re the only voter. Share this session so others can join.</span>
  </div>
)
