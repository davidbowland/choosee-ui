import Cookies from 'js-cookie'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'

import { AcceptButton, DisclaimerContainer, DisclaimerText } from './elements'

const COOKIE_NAME = 'disclaimer_accept'

const CookieDisclaimer = (): React.ReactNode => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (Cookies.get(COOKIE_NAME) !== 'true') {
      setVisible(true)
    }
  }, [])

  const handleDismiss = (): void => {
    const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:'
    Cookies.set(COOKIE_NAME, 'true', { path: '/', sameSite: 'strict', secure: isSecure })
    setVisible(false)
  }

  if (!visible) return null

  return (
    <DisclaimerContainer>
      <DisclaimerText>
        <p>
          This site only uses essential cookies such as those used to keep you logged in. We may collect your phone
          number simply to prevent fraud and to keep costs low. Depending on your activity, your IP address may appear
          in our logs for up to 90 days. We never sell your information.
        </p>
        <p>
          See our <Link href="/privacy-policy">privacy policy</Link> for more information.
        </p>
      </DisclaimerText>
      <AcceptButton onPress={handleDismiss} />
    </DisclaimerContainer>
  )
}

export default CookieDisclaimer
