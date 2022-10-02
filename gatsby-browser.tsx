import type { GatsbyBrowser } from 'gatsby'
import React from 'react'

import '@config/amplify'
import Themed from '@components/themed'

export const wrapPageElement: GatsbyBrowser['wrapPageElement'] = ({ element }): JSX.Element => {
  return <Themed>{element}</Themed>
}
