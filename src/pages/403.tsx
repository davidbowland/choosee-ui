import { AlertDescription, AlertRoot } from '@heroui/react'
import Head from 'next/head'
import Link from 'next/link'
import React from 'react'

import AppBar from '@components/app-bar'

const Forbidden = (): React.ReactNode => {
  return (
    <>
      <Head>
        <title>403: Forbidden | dbowland.com</title>
      </Head>
      <AppBar />
      <div className="mx-auto mt-8 max-w-md px-4">
        <h1 className="mb-4 text-xl font-semibold">403: Forbidden</h1>
        <AlertRoot status="danger">
          <AlertDescription>
            You are not allowed to access the resource you requested. If you feel you have reached this page in error,
            please contact the webmaster.
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

export default Forbidden
