import Link from 'next/link'
import React from 'react'

import { Brand, GoogleSignInButton, NavContainer, UserMenu } from './elements'
import { useAuthContext } from '@components/auth-context'

const AppBar = (): React.ReactNode => {
  const { isSignedIn, isLoading, user, handleSignIn, handleSignOut } = useAuthContext()

  return (
    <NavContainer>
      <Link href="/">
        <Brand>Choosee</Brand>
      </Link>
      {!isLoading && (
        <>
          {isSignedIn ? (
            <UserMenu name={user?.name ?? 'User'} onSignOut={handleSignOut} />
          ) : (
            <GoogleSignInButton onPress={handleSignIn} />
          )}
        </>
      )}
    </NavContainer>
  )
}

export default AppBar
