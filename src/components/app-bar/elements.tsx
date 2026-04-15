import { Button } from '@heroui/react'
import { LogOut } from 'lucide-react'
import React from 'react'

import { GoogleLogo } from '@components/google-logo'

export const NavContainer = ({ children }: { children: React.ReactNode }): React.ReactNode => (
  <nav className="sticky top-0 z-40 flex items-center justify-between border-b border-divider bg-background/95 px-6 py-3 backdrop-blur-sm">
    {children}
  </nav>
)

export const BrandLink = ({ children }: { children: React.ReactNode }): React.ReactNode => (
  <span className="choosee-brand text-2xl text-foreground">{children}</span>
)

export const GoogleSignInButton = ({ onPress }: { onPress: () => void }): React.ReactNode => (
  <Button onPress={onPress} size="sm" variant="outline">
    <GoogleLogo />
    Sign in with Google
  </Button>
)

export const UserMenu = ({ name, onSignOut }: { name: string; onSignOut: () => void }): React.ReactNode => (
  <div className="flex items-center gap-3">
    <span className="text-sm text-default-600">{name}</span>
    <Button onPress={onSignOut} size="sm" variant="outline">
      <LogOut className="h-4 w-4" />
      Sign out
    </Button>
  </div>
)
