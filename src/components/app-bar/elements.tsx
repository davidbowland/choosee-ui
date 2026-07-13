import { Button } from '@heroui/react'
import { LogOut } from 'lucide-react'
import React from 'react'

import { GoogleLogo } from '@components/google-logo'

export const NavContainer = ({ children }: { children: React.ReactNode }): React.ReactNode => (
  <nav className="px-4 pt-4 pb-2 relative z-40">
    <div className="mx-auto flex max-w-[960px] items-center justify-between rounded-full border border-white/[0.07] bg-white/[0.03] px-6 py-2">
      {children}
    </div>
  </nav>
)

export const BrandLink = ({ children }: { children: React.ReactNode }): React.ReactNode => (
  <span className="choosee-brand text-2xl text-[#F59E0B]">{children}</span>
)

const Mark = (): React.ReactNode => (
  <svg fill="none" height="16" viewBox="0 0 24 24" width="16">
    <path d="M4 6H9V12" stroke="#F59E0B" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.6} />
    <path d="M20 6H15V12" stroke="#F59E0B" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.6} />
    <path d="M9 12H15" stroke="#F59E0B" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.6} />
    <path d="M12 12V17" stroke="#F59E0B" strokeLinecap="round" strokeWidth={2.6} />
    <circle cx="4" cy="6" fill="#F59E0B" r="1.7" />
    <circle cx="20" cy="6" fill="#F59E0B" r="1.7" />
    <circle cx="12" cy="19.4" fill="#F59E0B" r="2.3" />
  </svg>
)

export const Brand = ({ children }: { children: React.ReactNode }): React.ReactNode => (
  <span className="flex items-center gap-2.5">
    <span className="rounded-[11px] border border-[#F59E0B]/20 bg-[#F59E0B]/[0.12] p-[3px]">
      <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[8px] bg-[#0D0D0E]">
        <Mark />
      </span>
    </span>
    <BrandLink>{children}</BrandLink>
  </span>
)

export const GoogleSignInButton = ({ onPress }: { onPress: () => void }): React.ReactNode => (
  <Button
    className="rounded-full border-white/[0.09] bg-white/[0.05] text-[#D4D4D4] hover:bg-white/[0.09]"
    onPress={onPress}
    size="sm"
    variant="outline"
  >
    <GoogleLogo />
    Sign in with Google
  </Button>
)

export const UserMenu = ({ name, onSignOut }: { name: string; onSignOut: () => void }): React.ReactNode => (
  <div className="flex items-center gap-3">
    <span className="text-sm text-[#6B7280]">{name}</span>
    <Button
      className="rounded-full border-white/[0.09] bg-white/[0.05] text-[#6B7280] hover:bg-white/[0.09]"
      onPress={onSignOut}
      size="sm"
      variant="outline"
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </Button>
  </div>
)
