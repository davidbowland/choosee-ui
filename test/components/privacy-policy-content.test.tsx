import React from 'react'

import PrivacyPolicy from '@components/privacy-policy'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

// These tests guard FACTS, not phrasing. Every assertion here exists because the claim it pins
// would become FALSE if the code changed underneath it. Nothing guards a sentence merely for being
// informative — the policy is deliberately short, and disclosures it chooses not to make are an
// editorial call, not a regression.
describe('PrivacyPolicy content', () => {
  const setup = (): void => {
    render(<PrivacyPolicy />)
  }

  // "of our own" is load-bearing and must not be trimmed to a flat "we set no cookies". That
  // shorter sentence is FALSE: SessionCreate injects reCAPTCHA v3 on the visitor's first
  // interaction with the document, and Google sets _GRECAPTCHA once that script runs. "once it
  // loads" is the other half of the same fact — the script is no longer injected on mount, so a
  // visitor who reads the page and leaves is never given the cookie.
  it('sets no cookies of its own and names the one third party that does', () => {
    setup()

    expect(screen.getByText(/We set no cookies of our own/i)).toBeInTheDocument()
    expect(screen.getByText(/Google's reCAPTCHA sets one once it loads/i)).toBeInTheDocument()
  })

  // redactEvent strips latitude/longitude from the request log and scrubGoogleError keeps them out
  // of the axios error thrown on a failed geocode, so nothing on our side retains the reading. The
  // claim must stay this narrow — the session record does keep the address derived from it, so a
  // wider "we don't keep your location" would be false. The disclosure that Google receives the
  // reading anyway must not be dropped, and neither may the opt-out, which is the only action
  // available to the reader.
  it('says the address is kept rather than the phone reading, and offers the opt-out', () => {
    setup()

    expect(screen.getByText(/We keep the address, and we neither store nor log the reading/i)).toBeInTheDocument()
    expect(screen.getByText(/Google still sees it/i)).toBeInTheDocument()
    expect(screen.getByText(/type the address yourself/i)).toBeInTheDocument()
  })

  // RetentionInDays: 30 on every log group; SESSION_EXPIRE_HOURS: '24'. The IP address must be
  // named rather than softened — it identifies a person, which is why the retention window exists.
  it('states the retention periods for logs and for a Choosee, and names what the logs hold', () => {
    setup()

    expect(screen.getByText(/logs each request for 30 days, including your IP address/i)).toBeInTheDocument()
    expect(screen.getByText(/A Choosee expires 24 hours after it/i)).toBeInTheDocument()
  })

  // readJoinedSessions does delete expired entries, but it runs only on the home page, and
  // services/push.ts keeps a per-Choosee context in Cache Storage with no TTL at all. Someone who
  // opens a link from a text message, joins, and never returns runs none of that code, so a promise
  // of automatic deletion cannot be kept. Only the control that really does delete it may be named.
  it('promises no automatic device-side deletion and names the real control', () => {
    setup()

    expect(screen.getByText(/Clearing this site's data in your browser erases them/i)).toBeInTheDocument()
    expect(screen.queryByText(/clears itself/i)).not.toBeInTheDocument()
  })

  // Guards against reintroducing the Google sign-in era: UserItem carries userId, name,
  // pushSubscriptions and expiration, and nothing in either repo collects an email address.
  it('makes no sign-in-era claims', () => {
    setup()

    expect(screen.getByText(/There's no account and nothing to sign up for/i)).toBeInTheDocument()
    expect(screen.queryByText(/email address/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/sign in with Google/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/googleSub/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/reminders/i)).not.toBeInTheDocument()
  })

  // Guards against reintroducing SMS copy: there is no STOP keyword and no unsubscribe
  // control, so any such promise would describe a capability we do not offer.
  it('makes no SMS-era promises', () => {
    setup()

    expect(screen.queryByText(/replying STOP/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/text you/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/phone number/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/180 days/i)).not.toBeInTheDocument()
  })

  // withRecaptchaRetry runs for CREATE_SESSION and for GEOCODE, and fetchAddress sends the token in
  // x-recaptcha-token — so a policy that mentioned only creation would leave the one reCAPTCHA
  // execute a privacy-conscious reader is most likely to care about, the one attached to their
  // coordinates, undisclosed.
  it('discloses reCAPTCHA on both guarded actions', () => {
    setup()

    expect(screen.getByText(/Google's reCAPTCHA checks that you're a person/i)).toBeInTheDocument()
    expect(screen.getByText(/when you create a Choosee and when you tap Use my location/i)).toBeInTheDocument()
  })
})
