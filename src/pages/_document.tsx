import { Head, Html, Main, NextScript } from 'next/document'
import React from 'react'

import { HINT_KEY } from '@utils/joined-sessions'

const description = 'Start a Choosee and vote your way to a restaurant.'
const ogImage = `${process.env.NEXT_PUBLIC_ORIGIN}/og-image.png`

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
        <link href="/favicon.ico" rel="icon" sizes="any" />
        <link href="/apple-touch-icon.png" rel="apple-touch-icon" />
        <link href="/manifest.json" rel="manifest" />
        <meta content="#0a0a0b" name="theme-color" />
        <meta content="Choosee" name="apple-mobile-web-app-title" />

        <meta content={description} name="description" />
        <meta content="noindex, nofollow" name="robots" />

        <meta content="website" property="og:type" />
        <meta content="Choosee" property="og:site_name" />
        <meta content="Choosee" property="og:title" />
        <meta content={description} property="og:description" />
        <meta content={ogImage} property="og:image" />
        <meta content="1200" property="og:image:width" />
        <meta content="630" property="og:image:height" />

        <meta content="summary_large_image" name="twitter:card" />
        <meta content="Choosee" name="twitter:title" />
        <meta content={description} name="twitter:description" />
        <meta content={ogImage} name="twitter:image" />
      </Head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('dark')",
          }}
        />
        {/* The home page's hero has two sizes, and which one is correct depends on data only the
            device holds. Deciding it in React would mean painting one and swapping to the other,
            which is the exact jump the two sizes exist to prevent. One numeric comparison, no
            parsing: the value is a timestamp, and a stale one is simply in the past. The key is
            imported rather than written out, so it cannot drift from the code that writes it.

            Wrapped in a function so `u` does not become a global. This runs on every page of the
            export, so the names it introduces are the whole origin's names. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(){try{var u=+localStorage.getItem('${HINT_KEY}');if(u&&Date.now()<u){document.documentElement.dataset.resume='1'}}catch(e){}}()`,
          }}
        />
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
