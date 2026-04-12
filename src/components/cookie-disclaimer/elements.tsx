import { Button } from '@heroui/react'
import React from 'react'

export const DisclaimerContainer = ({ children }: { children: React.ReactNode }): React.ReactNode => (
  <div className="fixed inset-x-0 bottom-0 z-50 border-t border-divider bg-background p-4 shadow-lg">
    <div className="flex flex-col gap-2">
      <h6 className="text-lg font-medium">Cookie and Privacy Disclosure</h6>
      <div className="flex w-full flex-col items-center gap-2 sm:flex-row sm:justify-center">{children}</div>
    </div>
  </div>
)

export const DisclaimerText = ({ children }: { children: React.ReactNode }): React.ReactNode => (
  <div className="flex flex-1 flex-col gap-1 text-sm">{children}</div>
)

export const AcceptButton = ({ onPress }: { onPress: () => void }): React.ReactNode => (
  <div className="w-full p-1 text-center sm:w-auto sm:min-w-[200px]">
    <Button className="w-full" onPress={onPress}>
      Accept &amp; continue
    </Button>
  </div>
)
