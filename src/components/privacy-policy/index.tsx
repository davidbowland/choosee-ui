import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

const Section = ({ title, children }: { title: string; children: React.ReactNode }): React.ReactNode => (
  <div className="flex flex-col gap-3 border-t border-[rgba(255,255,255,0.06)] pt-8">
    <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-[#F59E0B]">{title}</h2>
    <div className="flex flex-col gap-3 text-default-800">{children}</div>
  </div>
)

const PrivacyPolicy = (): React.ReactNode => {
  return (
    <div className="flex flex-col gap-8 px-6 py-12 md:px-12">
      <div className="flex flex-col gap-4">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#F59E0B]">Legal</p>
        <h1 className="text-4xl font-bold text-white">Privacy Policy</h1>
        <p className="text-default-800">
          There&apos;s no account and nothing to sign up for. No analytics, no ads, and we never sell your data. We set
          no cookies of our own; Google&apos;s reCAPTCHA sets one once it loads.
        </p>
      </div>

      <Section title="What We Collect">
        <p>
          A Choosee holds the search you set up, everyone&apos;s votes, and whatever name each voter typed. Names are
          optional. A Choosee expires 24 hours after it&apos;s created, and everything in it is deleted then. It&apos;s
          just a link, so anyone holding that link can open it.
        </p>
        <p>
          Our server logs each request for 30 days, including your IP address. We never use those logs to work out who
          you are.
        </p>
        <p>
          Tap Use my location and your phone&apos;s coordinates go to Google, which sends back a street address. We keep
          the address, and we neither store nor log the reading from your phone — but Google still sees it, so type the
          address yourself if you&apos;d rather it didn&apos;t.
        </p>
        <p>
          Google&apos;s reCAPTCHA checks that you&apos;re a person and not a bot when you create a Choosee and when you
          tap Use my location, and it sends your IP address and details about your device to Google. What Google does
          with what it receives is covered by{' '}
          <Link
            className="text-[#F59E0B] underline hover:text-amber-400"
            href="https://policies.google.com/privacy"
            rel="noreferrer"
            target="_blank"
          >
            policies.google.com/privacy
          </Link>
          .
        </p>
      </Section>

      <Section title="Notifications">
        <p>
          Turn notifications on and your browser gives us an address to send them to. Turning them off deletes it. They
          travel through the push service your browser&apos;s maker runs — Apple, Google or Mozilla — encrypted, so it
          can see one is on its way but not what it says.
        </p>
      </Section>

      <Section title="On Your Device">
        <p>
          The app remembers the Choosees you&apos;ve joined so you can pick one back up. Clearing this site&apos;s data
          in your browser erases them.
        </p>
      </Section>

      <Section title="Questions And Requests">
        <p>
          Depending on where you live, the law may give you rights over your personal data — to see it, correct it, or
          have it deleted. Choosee is meant for people 13 and older. Email{' '}
          <Link className="text-[#F59E0B] underline hover:text-amber-400" href="mailto:privacy@dbowland.com">
            privacy@dbowland.com
          </Link>{' '}
          with anything at all.
        </p>
      </Section>

      <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.06)] pt-6 text-sm text-default-500">
        <Link className="flex items-center gap-1 hover:text-default-800" href="/">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
          Back to Choosee
        </Link>
        <span>Last updated August 2026</span>
      </div>
    </div>
  )
}

export default PrivacyPolicy
