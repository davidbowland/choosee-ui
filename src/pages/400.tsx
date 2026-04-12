import { AlertDescription, AlertRoot } from '@heroui/react'
import Head from 'next/head'
import Link from 'next/link'
import React from 'react'

import AppBar from '@components/app-bar'

const BadRequest = (): React.ReactNode => {
  return (
    <>
      <Head>
        <title>400: Bad Request | dbowland.com</title>
      </Head>
      <AppBar />
      <div className="mx-auto mt-8 max-w-md px-4">
        <h1 className="mb-4 text-xl font-semibold">400: Bad Request</h1>
        <AlertRoot status="danger">
          <AlertDescription>
            Your request was malformed or otherwise could not be understood by the server. Please modify your request
            before retrying.
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

export default BadRequest
