import Link from 'next/link'
import React from 'react'

import { Brand, NavContainer } from './elements'

// The bar renders the wordmark alone for now — the slot vacated by Google sign-in is filled
// by the install button in a later task.
const AppBar = (): React.ReactNode => (
  <NavContainer>
    <Link href="/">
      <Brand>Choosee</Brand>
    </Link>
  </NavContainer>
)

export default AppBar
