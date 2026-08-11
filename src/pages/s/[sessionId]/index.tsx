import type { GetStaticPaths, GetStaticProps } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'

import AppBar from '@components/app-bar'
import PrivacyLink from '@components/privacy-link'
import Session from '@components/session'

/**
 * Keyed on `asPath` rather than run once on mount.
 *
 * Next reuses this component across two instances of the same dynamic route, so a client-side
 * navigation from one Choosee to another does not remount it. Read the path once and the identifier
 * goes stale: submit a corrected code from a failed Choosee's error screen and the same error redraws,
 * for the code you just fixed.
 *
 * Latent until the entry sheet existed, because arrival used to be a full page load every time.
 */
function useSessionIdFromPath(): string | undefined {
  const { asPath } = useRouter()
  const [sessionId, setSessionId] = useState<string | undefined>()
  useEffect(() => {
    // URL pattern: /s/<sessionId>/
    const match = window.location.pathname.match(/^\/s\/([^/]+)/)
    setSessionId(match ? decodeURIComponent(match[1]) : undefined)
  }, [asPath])
  return sessionId
}

const SessionPage = (): React.ReactNode => {
  const sessionId = useSessionIdFromPath()

  return (
    <>
      <Head>
        <title>Choosee</title>
      </Head>
      <AppBar />
      <main className="mx-auto flex min-h-[100dvh] max-w-4xl flex-col px-4 py-6">
        {/* Keyed so a different Choosee is a different component instance. The path read above is
            only a third of the problem: useSessionIdentity seeds its state in a lazy useState, and
            the ?id= handoff is consumed in a useMemo([]) — both mount-only for the same reason. Left
            unkeyed, resuming into an already-joined Choosee arrives carrying the previous session's
            identity, finds no match, shows the name picker, and the voter joins a second time and
            forks their own votes. */}
        <div className="flex-1">{sessionId ? <Session key={sessionId} sessionId={sessionId} /> : null}</div>
        <PrivacyLink />
      </main>
    </>
  )
}

export const getStaticPaths: GetStaticPaths = () => {
  if (process.env.NODE_ENV === 'development') {
    return { fallback: 'blocking', paths: [] }
  }
  return { fallback: false, paths: [{ params: { sessionId: '__placeholder__' } }] }
}

export const getStaticProps: GetStaticProps = () => ({ props: {} })

export default SessionPage
