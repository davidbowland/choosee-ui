import { AlertDescription, AlertRoot } from '@heroui/react'
import Head from 'next/head'
import Link from 'next/link'
import React from 'react'

import AppBar from '@components/app-bar'

const InternalServerError = (): React.ReactNode => {
  return (
    <>
      <Head>
        <title>500: Internal Server Error | dbowland.com</title>
      </Head>
      <AppBar />
      <div className="mx-auto mt-8 max-w-md px-4">
        <h1 className="mb-4 text-xl font-semibold">500: Internal Server Error</h1>
        <AlertRoot status="danger">
          <AlertDescription>
            An internal server error has occurred trying to serve your request. If you continue to experience this
            error, please contact the webmaster.
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

export default InternalServerError
