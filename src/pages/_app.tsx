import '@fontsource-variable/outfit'
import '@fontsource/bebas-neue'
import { ToastProvider } from '@heroui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { AppProps } from 'next/app'
import React, { useEffect, useState } from 'react'

import '@assets/css/index.css'
import CookieDisclaimer from '@components/cookie-disclaimer'

export default function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    // Set initial dark mode on first mount
    document.documentElement.classList.toggle('dark', mq.matches)
    const handler = (e: MediaQueryListEvent) => document.documentElement.classList.toggle('dark', e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <div className="bg-background text-foreground min-h-screen">
        <Component {...pageProps} />
        <CookieDisclaimer />
      </div>
      <ToastProvider placement="bottom" />
    </QueryClientProvider>
  )
}
