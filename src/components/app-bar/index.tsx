import Link from 'next/link'
import React from 'react'

import { BrandLink, NavContainer } from './elements'

const AppBar = (): React.ReactNode => (
  <NavContainer>
    <Link href="/">
      <BrandLink>Choosee</BrandLink>
    </Link>
  </NavContainer>
)

export default AppBar
