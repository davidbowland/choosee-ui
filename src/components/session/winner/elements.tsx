import { Button } from '@heroui/react'
import { Eye, Trophy } from 'lucide-react'
import React from 'react'

export const WinnerContainer = ({ children }: { children: React.ReactNode }): React.ReactNode => (
  <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5 p-4">{children}</div>
)

export const WinnerLoading = (): React.ReactNode => (
  <div className="flex flex-col items-center gap-4 p-8">
    <div className="relative h-12 w-12">
      <div className="absolute inset-0 animate-spin rounded-full border-4 border-default-200 border-t-warning" />
    </div>
    <p className="text-default-500">Revealing the winner…</p>
  </div>
)

export const WinnerTitle = (): React.ReactNode => (
  <div className="flex flex-col items-center gap-2">
    <div className="animate-bounce">
      <Trophy className="h-12 w-12 text-warning" />
    </div>
    <h2 className="choosee-brand text-4xl text-warning">WINNER</h2>
  </div>
)

export const NewSessionButton = ({ onPress }: { onPress: () => void }): React.ReactNode => (
  <Button className="w-full" onPress={onPress} variant="primary">
    Start new session
  </Button>
)

export const BracketButton = ({ onPress }: { onPress: () => void }): React.ReactNode => (
  <Button onPress={onPress} variant="outline">
    <Eye className="h-4 w-4" />
    View final bracket
  </Button>
)
