import Themed from '@components/themed'
import type { GatsbyBrowser } from 'gatsby'
import React from 'react'

import '@config/amplify'

export const wrapPageElement: GatsbyBrowser['wrapPageElement'] = ({ element }): JSX.Element => {
  return <Themed>{element}</Themed>
}
