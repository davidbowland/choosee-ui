import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

const Section = ({ title, children }: { title: string; children: React.ReactNode }): React.ReactNode => (
  <div className="flex flex-col gap-3 border-t border-[rgba(255,255,255,0.06)] pt-8">
    <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-[#F59E0B]">{title}</h2>
    <div className="flex flex-col gap-3 text-[#D4D4D4]">{children}</div>
  </div>
)

const PrivacyPolicy = (): React.ReactNode => {
  return (
    <div className="flex flex-col gap-8 px-6 py-12 md:px-12">
      <div className="flex flex-col gap-4">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#F59E0B]">Legal</p>
        <h1 className="text-4xl font-bold text-white">Privacy Policy</h1>
        <p className="text-[#D4D4D4]">
          There&apos;s no account and nothing to sign up for. We collect very little, we keep it briefly, and we never
          sell it.
        </p>
      </div>

      <Section title="What We Collect">
        <p>
          Our servers log your IP address, browser type, and the pages you visit. We read those logs to spot abuse and
          keep the site running.
        </p>
        <p>
          There&apos;s no sign-in and no account. A Choosee is a link — anyone holding it can open it — and we never ask
          who you are.
        </p>
        <p>
          When you create a Choosee we store what you asked us to search for: the address, the kinds of places you want
          and don&apos;t want, the distance, and how you want them ranked. Inside a Choosee we store your votes, and the
          name you type if you set one. A name is optional, and we don&apos;t check it against anything.
        </p>
        <p>
          Your browser keeps track of the Choosees you&apos;ve joined recently and which voter you are in each, so you
          can pick one back up from the home page. That never leaves your device. We set no cookies of our own;
          Google&apos;s reCAPTCHA sets one, which is how it tells you apart from a bot. We run nothing for analytics or
          advertising.
        </p>
        <p>
          If you tap Use my location, your browser sends us your coordinates and we pass them to Google to get a street
          address back. We store the address on the Choosee and we don&apos;t keep the coordinates — they&apos;re
          stripped out of our logs and out of anything we record when a request fails. Google still receives them, which
          is how the address comes back. Type the address instead if you&apos;d rather not send them at all; nothing
          else about the Choosee changes.
        </p>
        <p>
          If you turn on notifications, your browser gives us an address to send them to. It identifies that browser on
          that device — not you. No name, no email, no account is attached to it. We keep it against your record in that
          one Choosee, and it&apos;s deleted when the Choosee expires or when you turn notifications off.
        </p>
        <p>A notification tells you which Choosee it&apos;s about, which round opened, and which restaurant won.</p>
        <p>
          When you create a Choosee, we use Google reCAPTCHA to verify you&apos;re not a bot. reCAPTCHA collects
          technical and interaction data from your browser — such as your IP address and device information — and sends
          it to Google for analysis.
        </p>
      </Section>

      <Section title="Why We Collect It">
        <p>
          We keep server logs to run the site securely — that&apos;s our lawful basis for them, not your consent. We
          don&apos;t use any of it for advertising or profiling.
        </p>
        <p>
          We send a notification only if you switch them on, and only about the Choosee you switched them on for. They
          stop when it expires.
        </p>
      </Section>

      <Section title="What We Don't Do">
        <p>
          We don&apos;t sell your data. We don&apos;t share it with advertisers. We don&apos;t build profiles. There is
          no account to create and no contact details to hand over, so the only way we can reach you is a notification
          you asked for.
        </p>
      </Section>

      <Section title="When We Share Your Data">
        <p>
          We share data only when legally required — for example, in response to a valid court order or law enforcement
          request.
        </p>
        <p>
          We send Google the address you typed, so it can find the coordinates and the restaurants nearby, and we send
          it your coordinates when you tap Use my location, so it can find the address. Google&apos;s handling of that
          data is described at{' '}
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
        <p>
          For reCAPTCHA, Google acts as our data processor: it handles bot-detection data on our behalf and does not use
          it for its own purposes.
        </p>
        <p>
          Notifications travel through the push service your browser&apos;s maker runs — Apple, Google or Mozilla,
          depending on your browser. They pass the message along to your device. We encrypt it first, so they can see
          that a notification is on its way but not what it says.
        </p>
      </Section>

      <Section title="Your Rights">
        <p>
          Depending on where you live, you may have legal rights over your personal data — such as the right to access,
          correct, or delete it. To exercise any such rights, contact us at{' '}
          <Link className="text-[#F59E0B] underline hover:text-amber-400" href="mailto:privacy@dbowland.com">
            privacy@dbowland.com
          </Link>
          .
        </p>
      </Section>

      <Section title="Data Retention">
        <p>
          Server logs are deleted after 30 days. Everything inside a Choosee — the address, the restaurants, the votes,
          any names, and the address notifications are sent to — is deleted when the Choosee expires, 24 hours after
          it&apos;s created. There&apos;s no account, so nothing survives that.
        </p>
        <p>
          What your browser remembers about your Choosees stays on your device. We stop using it after a day, and
          clearing your browser&apos;s data for this site removes it.
        </p>
      </Section>

      <Section title="Age">
        <p>This site is intended for people 13 and older.</p>
      </Section>

      <Section title="Changes">
        <p>
          If we change how we handle data in a meaningful way, we&apos;ll update this page. The date at the bottom
          reflects the last revision.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about this policy? Email{' '}
          <Link className="text-[#F59E0B] underline hover:text-amber-400" href="mailto:privacy@dbowland.com">
            privacy@dbowland.com
          </Link>
          .
        </p>
      </Section>

      <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.06)] pt-6 text-sm text-[#4B5563]">
        <Link className="flex items-center gap-1 hover:text-[#D4D4D4]" href="/">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
          Back to Choosee
        </Link>
        <span>Last updated August 2026</span>
      </div>
    </div>
  )
}

export default PrivacyPolicy
