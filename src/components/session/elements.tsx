import { Alert, AlertDescription, AlertRoot } from '@heroui/react'
import { Clock, Users } from 'lucide-react'
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

export const ClosingSoonErrorAlert = (): React.ReactNode => (
  <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-6">
    <AlertRoot status="warning">
      <AlertDescription>
        <div className="flex items-start gap-2">
          <Clock className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-medium">Not enough open restaurants nearby</p>
            <p className="mt-1 text-sm opacity-80">
              Try creating a new session without the &ldquo;closing soon&rdquo; filter, or search a wider area.
            </p>
          </div>
        </div>
      </AlertDescription>
    </AlertRoot>
    <Link className="text-primary underline" href="/">
      Try again
    </Link>
  </div>
)

export const SoloVoterHint = (): React.ReactNode => (
  <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-600 dark:text-warning-400">
    <Users className="h-4 w-4 flex-shrink-0" />
    <span>You&apos;re the only voter. Share this session so others can join.</span>
  </div>
)

export const FilterClosingSoonBadge = (): React.ReactNode => (
  <div className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs text-primary">
    <Clock className="h-3 w-3" />
    <span>Open restaurants only</span>
  </div>
)
