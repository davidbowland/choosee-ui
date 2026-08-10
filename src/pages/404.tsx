import Head from 'next/head'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'

import AppBar from '@components/app-bar'
import JoinSheet from '@components/join-sheet'
import { JoinRecoveryButton } from '@components/join-sheet/elements'

const NotFound = (): React.ReactNode => {
  const [display404, setDisplay404] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)

  useEffect(() => {
    setDisplay404(window.location.pathname.match(/^\/s\/[^/]+$/) === null)
  }, [])

  if (display404) {
    return (
      <>
        <Head>
          <title>404: Not Found | Choosee</title>
        </Head>
        <AppBar />
        <div className="mx-auto mt-8 flex max-w-md flex-col items-center px-4 text-center">
          <h1 className="mb-4 text-xl font-semibold">Page not found</h1>
          <p className="mb-4 text-default-500">That link may have expired or been mistyped.</p>
          {/* "a Choosee code", not "the code": this page establishes no referent, so a bare noun
              reads as "what code?". And the sheet opens empty — a real 404 here is a mistyped page
              slug, so prefilling would helpfully offer the user their own typo. */}
          <JoinRecoveryButton label="Enter a Choosee code" onPress={() => setJoinOpen(true)} />
          <Link className="mt-4 text-accent underline" href="/">
            Go home
          </Link>
        </div>
        <JoinSheet isOpen={joinOpen} onClose={() => setJoinOpen(false)} />
      </>
    )
  }
  return (
    <>
      <Head>
        <title>404: Not Found | Choosee</title>
      </Head>
    </>
  )
}

export default NotFound
