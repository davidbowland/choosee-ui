import { Utensils } from 'lucide-react'
import Head from 'next/head'
import React from 'react'

import ActiveSessions from '@components/active-sessions'
import AppBar from '@components/app-bar'
import PrivacyLink from '@components/privacy-link'
import SessionCreate from '@components/session-create'
import { useJoinedSessions } from '@hooks/useJoinedSessions'

// Read here rather than inside ActiveSessions so there is one list and one reader. A second caller
// would be a second copy that a dismissal could leave disagreeing with the first.
const Index = (): React.ReactNode => {
  const { entries, hasLoaded, onDismiss, onGone } = useJoinedSessions()

  return (
    <>
      <Head>
        <title>Choosee</title>
      </Head>
      <AppBar />
      <main className="mx-auto max-w-[1060px] px-5 pt-10 pb-12">
        <div
          className={`home-grid flex flex-col gap-10 md:grid md:grid-cols-[1fr_460px] md:gap-11 md:pt-4 ${
            hasLoaded && entries.length === 0 ? 'resume-empty' : ''
          }`}
        >
          {/* Hero left column. Both the pitch and the short headline ship in the markup, and CSS
              picks between them from data-resume — deciding it in React would mean painting one and
              swapping to the other, which is the jump the compact hero exists to remove. */}
          <div className="flex flex-col gap-5">
            <div className="arena-eyebrow flex items-center gap-2">
              <Utensils aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
              Find your next restaurant
            </div>
            {/* One heading, two sizes — a second, hidden h1 would be a second level-one heading in
                the outline for no reason. The space before each break is load-bearing: the breaks
                are display:none in the compact setting, and without it WHERE ARE runs straight into
                WE. Each break must stay on the SAME row as the text it follows — move one onto a row
                of its own and JSX trims the whitespace on both sides of it, which is exactly how you
                get WHERE AREWE EATING?. The page test asserts the headline's text rather than
                trusting the formatter to leave this alone. */}
            <h1 className="choosee-brand hero-title leading-[0.9] text-foreground">
              WHERE ARE <br className="hero-break" />
              WE <br className="hero-break" />
              <span className="text-[#F59E0B]">EATING?</span>
            </h1>
            <p className="max-w-[320px] text-sm leading-[1.7] text-default-500" data-hero="full">
              Can&apos;t agree on where to eat? Start a Choosee &mdash; we&apos;ll line up restaurants near you and
              everyone votes until there&apos;s a winner.
            </p>
            <p className="max-w-[320px] text-sm leading-[1.7] text-default-500" data-hero="compact">
              Line up restaurants near you and let everyone vote until there&apos;s a winner.
            </p>
            {/* Beneath the headline, so no number of cards can move it. The column is top-aligned
                whenever there are cards to push — data-resume and a non-empty list mean each other
                on first paint — and centered only in the first-visit setting, where there is nothing
                below the headline to push anything. ActiveSessions renders nothing at all when there
                are none, so a first-time visitor sees this page exactly as it was. */}
            <ActiveSessions entries={entries} onDismiss={onDismiss} onGone={onGone} />
          </div>
          {/* Form right column. The label demotes the create card while there is something else on
              the page to pick back up, and it has to satisfy two things that pull apart.

              It cannot key off data-resume alone: that attribute latches so the headline cannot
              regrow, and a latched label would go on saying "Start another Choosee" after you
              dismissed the only other one — announcing "another" when there is no first. So React
              takes it away once storage has been read and come back empty.

              But it also cannot wait for storage. `entries` is [] during the static export, so a
              plain `length > 0` would leave the row out of the prerendered markup and drop it in a
              frame later, pushing the create card and its text input down — the same shift the
              skeletons and the reserved overflow row exist to prevent, one column over. So it ships
              in the markup, CSS shows it only when data-resume says this is a returning visitor, and
              `hasLoaded` is what distinguishes "not read yet" from "read, and empty".

              A heading, matching the "Pick back up" h2 it mirrors across the page — identical amber
              eyebrows, one of which is in the outline and one of which is loose text, would leave the
              create column with no entry in the document outline at all. */}
          <div className="flex flex-col gap-4">
            {(!hasLoaded || entries.length > 0) && (
              <div className="resume-only flex items-center gap-3">
                <h2 className="arena-eyebrow">Start another Choosee</h2>
                <span className="h-px flex-1 bg-white/[0.07]" />
              </div>
            )}
            <SessionCreate />
          </div>
        </div>
      </main>
      <PrivacyLink />
    </>
  )
}

export default Index
