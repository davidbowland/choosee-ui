import React from 'react'

export const NavContainer = ({ children }: { children: React.ReactNode }): React.ReactNode => (
  <nav className="sticky top-0 z-40 border-b border-divider bg-background/95 px-6 py-3 backdrop-blur-sm">
    {children}
  </nav>
)

export const BrandLink = ({ children }: { children: React.ReactNode }): React.ReactNode => (
  <span className="choosee-brand text-2xl text-foreground">{children}</span>
)
