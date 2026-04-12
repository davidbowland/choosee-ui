import { AlertDescription, AlertRoot } from '@heroui/react'
import Head from 'next/head'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'

import AppBar from '@components/app-bar'

const NotFound = (): React.ReactNode => {
  const [display404, setDisplay404] = useState(false)

  useEffect(() => {
    setDisplay404(window.location.pathname.match(/^\/s\/[^/]+$/) === null)
  }, [])

  if (display404) {
    return (
      <>
        <Head>
          <title>404: Not Found | dbowland.com</title>
        </Head>
        <AppBar />
        <div className="mx-auto mt-8 max-w-md px-4">
          <h1 className="mb-4 text-xl font-semibold">404: Not Found</h1>
          <AlertRoot status="danger">
            <AlertDescription>
              The resource you requested is unavailable. If you feel you have reached this page in error, please contact
              the webmaster.
            </AlertDescription>
          </AlertRoot>
          <div className="mt-4 text-center">
            <Link className="text-primary underline" href="/">
              Go home
            </Link>
          </div>
        </div>
      </>
    )
  }
  return (
    <>
      <Head>
        <title>404: Not Found | dbowland.com</title>
      </Head>
    </>
  )
}

export default NotFound
