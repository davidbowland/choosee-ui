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
          This policy describes how Choosee handles your data. The short version: we collect very little, we keep it
          briefly, and we never sell it.
        </p>
      </div>

      <Section title="What We Collect">
        <p>
          Our servers automatically log your IP address, browser type, and the pages you visit. We use these logs to
          detect abuse and keep the site running.
        </p>
        <p>
          If you sign in with Google, we receive your name and email address as part of that sign-in flow. We set a
          cookie to keep you identified within your Choosee.
        </p>
        <p>
          If you provide a phone number, we use it only to send Choosee invites via text message. Your phone number is
          never used for anything else.
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
          rely on your consent, and we don&apos;t use your data for advertising or profiling.
        </p>
      </Section>

      <Section title="What We Don't Do">
        <p>
          We don&apos;t sell your data. We don&apos;t share it with advertisers. We don&apos;t build profiles. We
          don&apos;t use your phone number or email for marketing.
        </p>
      </Section>

      <Section title="When We Share Your Data">
        <p>
          We share data only when legally required — for example, in response to a valid court order or law enforcement
          request. Your Google sign-in is a direct relationship with Google; their privacy policy governs that
          interaction.
        </p>
        <p>
          For reCAPTCHA, Google acts as our data processor: it handles bot-detection data on our behalf and does not use
          it for its own purposes. Google&apos;s handling of that data is described at{' '}
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
          Server logs are kept for up to 90 days, then deleted. Restaurant Choosee data is deleted when your Choosee
          expires — typically 24 hours. If you create an account, your login information is stored until you delete it.
          Phone numbers are retained only for the duration of the Choosee.
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
          </Link>{' '}
          or write to:
        </p>
        <p>
          Choosee Privacy
          <br />
          P.O. Box 81226, Seattle, WA 98108-1226
        </p>
      </Section>

      <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.06)] pt-6 text-sm text-[#4B5563]">
        <Link className="flex items-center gap-1 hover:text-[#D4D4D4]" href="/">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
          Back to Choosee
        </Link>
        <span>Last updated July 2026</span>
      </div>
    </div>
  )
}

export default PrivacyPolicy
