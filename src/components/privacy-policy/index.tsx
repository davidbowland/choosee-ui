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
          This policy describes how Choosee handles your data. The short version: there&apos;s no account, we collect
          very little, we keep it briefly, and we never sell it.
        </p>
      </div>

      <Section title="What We Collect">
        <p>
          Our servers automatically log your IP address, browser type, and the pages you visit. We use these logs to
          detect abuse and keep the site running.
        </p>
        <p>
          There&apos;s no sign-in and no account. A Choosee is a link — anyone holding it can open it — and we never ask
          who you are.
        </p>
        <p>
          When you create a Choosee we store what you asked us to search for: the address, the kinds of places you want
          and don&apos;t want, the distance, and how you want them ranked. Inside a Choosee we store the votes you cast
          and, if you tap your name to change it, whatever you type there. A name is optional and we don&apos;t check it
          against anything.
        </p>
        <p>
          When you join a Choosee we set one cookie. It&apos;s named <code>choosee_user_</code> followed by that
          Choosee&apos;s ID, and it holds the ID that Choosee handed you — nothing else. Its path is that same Choosee,
          so your browser sends it back on those pages and nowhere else, and it expires a day after it&apos;s set.
        </p>
        <p>
          If you tap Use my location, your browser sends your coordinates to us and we pass them to Google to get a
          street address back. Only the address is stored on the Choosee — but the coordinates do reach our server logs
          and are deleted with them. Type the address instead if you&apos;d rather not send them; nothing else about the
          Choosee changes.
        </p>
        <p>
          If you turn on notifications, your browser mints a push subscription: a URL it issues, plus a pair of keys.
          That&apos;s the whole thing. It identifies one browser on one device, not a person — there&apos;s no name, no
          address, and no account attached to it. We store it against your record in that one Choosee and nowhere else,
          and it dies when the Choosee expires. Turning notifications off deletes it too — from your browser first, then
          from us.
        </p>
        <p>
          A notification carries which Choosee it&apos;s about, which round opened, and the winning restaurant&apos;s
          name. It&apos;s encrypted with keys your browser generated before it leaves our servers.
        </p>
        <p>
          When you create a Choosee, we use Google reCAPTCHA to verify you&apos;re not a bot. reCAPTCHA collects
          technical and interaction data from your browser — such as your IP address and device information — and sends
          it to Google for analysis.
        </p>
      </Section>

      <Section title="Why We Collect It">
        <p>
          We process server log data under legitimate interests — operating a secure, functional website. We don&apos;t
          rely on your consent for that, and we don&apos;t use your data for advertising or profiling.
        </p>
        <p>
          We only notify you when you turn notifications on, and only because you asked us to. We send nothing until you
          switch it on. Notifications relate to a single Choosee and stop when it expires.
        </p>
      </Section>

      <Section title="What We Don't Do">
        <p>
          We don&apos;t sell your data. We don&apos;t share it with advertisers. We don&apos;t build profiles. There is
          no account to create and no contact details to hand over, so we have no way to reach you away from the site.
        </p>
        <p>
          A push subscription URL is a capability: anyone holding it could notify that device. When a notification fails
          to deliver, what we log is which push service turned it down — not the URL.
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
          Notifications travel through the push service your browser maker runs. We hand it the subscription URL your
          browser issued and an encrypted message, and it delivers that message to your device.
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
          Server logs are deleted automatically after 30 days. Everything inside a Choosee — the address, the
          restaurants, the votes, any names, and any push subscriptions — is deleted when the Choosee expires, 24 hours
          after it&apos;s created. There&apos;s no account, so nothing survives that.
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
