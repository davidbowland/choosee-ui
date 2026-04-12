import Head from 'next/head'
import React from 'react'

import AppBar from '@components/app-bar'
import PrivacyLink from '@components/privacy-link'
import SessionCreate from '@components/session-create'

const Index = (): React.ReactNode => (
  <>
    <Head>
      <title>Choosee | dbowland.com</title>
    </Head>
    <AppBar />
    <div className="mx-auto flex min-h-[calc(100vh-56px)] max-w-[1200px] flex-col p-4">
      <div className="flex flex-1 items-start justify-center">
        <SessionCreate />
      </div>
      <PrivacyLink />
    </div>
  </>
)

export default Index
