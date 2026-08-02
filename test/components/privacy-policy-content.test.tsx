import React from 'react'

import PrivacyPolicy from '@components/privacy-policy'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

describe('PrivacyPolicy content', () => {
  const setup = (): void => {
    render(<PrivacyPolicy />)
  }

  // Identity moved to localStorage, which the home page can read and a path-scoped cookie could not.
  // The WORD "cookie" still has to appear — disclosure regimes expect cookies named as such, and a
  // policy silent on them reads as an oversight rather than a negative. What replaced it has to be
  // described in its place, or the section is a gap.
  //
  // "of our own" is load-bearing and must not be trimmed to a flat "we set no cookies". That shorter
  // sentence is FALSE: session-create injects reCAPTCHA v3 on mount, SessionCreate is on the home
  // page, so every visitor loads it and Google sets _GRECAPTCHA. A privacy policy is the one place a
  // convenient simplification becomes a false statement, so the reCAPTCHA clause is asserted here
  // rather than left to survive on good intentions.
  it('sets no cookies of its own, names the one third party that does, and describes what replaced ours', () => {
    setup()

    expect(screen.getByText(/We set no cookies of our own/i)).toBeInTheDocument()
    expect(screen.getByText(/Google's reCAPTCHA sets one/i)).toBeInTheDocument()
    expect(screen.getByText(/keeps track of the Choosees you've joined recently/i)).toBeInTheDocument()
    expect(screen.getByText(/never leaves your device/i)).toBeInTheDocument()
  })

  // pushManager.subscribe() mints a URL bound to one browser on one device. Nothing in
  // UserItem ties it to a person, and post-push-subscription is unauthenticated for that reason.
  it('describes a push subscription as identifying a browser rather than a person', () => {
    setup()

    expect(screen.getByText(/identifies that browser on\s+that device — not you/i)).toBeInTheDocument()
    expect(screen.getByText(/No name, no email, no account is attached to it/i)).toBeInTheDocument()
  })

  // unsubscribeFromPush unsubscribes the browser and then DELETEs the stored copy, and the user
  // row TTLs with its session either way.
  it('states that turning notifications off deletes the subscription', () => {
    setup()

    expect(screen.getByText(/deleted when the Choosee expires or when you turn notifications off/i)).toBeInTheDocument()
  })

  it('states that nothing is sent until notifications are switched on', () => {
    setup()

    expect(screen.getByText(/only if you switch them on/i)).toBeInTheDocument()
  })

  // GET /reverse-geocode takes latitude and longitude as query parameters, and redactEvent keeps
  // query parameters. Only the resolved address is stored, but the coordinates are logged.
  // The claim changed because the CODE changed: redactEvent strips latitude/longitude from the
  // request log, and scrubGoogleError keeps them out of the axios error thrown on a failed geocode.
  // Both had to be true before this sentence could be. The disclosure that Google still receives
  // them must not be dropped — that is the part a reader cannot infer.
  it('says the address is stored rather than the coordinates, and offers the opt-out', () => {
    setup()

    expect(screen.getByText(/We store the address on the Choosee/i)).toBeInTheDocument()
    expect(screen.getByText(/Google still receives them/i)).toBeInTheDocument()
    expect(screen.getByText(/Type the address instead/i)).toBeInTheDocument()
  })

  // RetentionInDays: 30 on every log group; SESSION_EXPIRE_HOURS: '24'.
  it('states the retention periods for logs and for a Choosee', () => {
    setup()

    expect(screen.getByText(/Server logs are deleted after 30 days/i)).toBeInTheDocument()
    expect(screen.getByText(/24 hours\s+after it/i)).toBeInTheDocument()
  })

  // Two things this has to get right, both of which a shorter sentence gets wrong.
  //
  // Scope: "what your browser remembers" unqualified is false here. The push subscription is also
  // something the browser remembers, and this policy says twelve lines earlier that we keep a copy
  // server-side until the Choosee expires — so an unscoped claim would contradict the same document
  // and tell a reader the push address was never stored.
  //
  // Two things this sentence must not say, both of which earlier drafts said and both of which were
  // false.
  //
  // Not "what your browser remembers", unscoped: the push subscription is also something the browser
  // remembers, and this policy says twelve lines earlier that we keep a copy server-side until the
  // Choosee expires.
  //
  // Not "clears itself after a day": readJoinedSessions does delete expired entries, but it only
  // runs on the home page, and services/push.ts keeps a per-Choosee context in Cache Storage with no
  // TTL at all. Someone who opens a link from a text message, joins, and never returns runs none of
  // that code. A promise of automatic deletion cannot be kept on a device that stops running the
  // app, so the policy claims what is actually true — we stop USING it after a day — and names the
  // control that really does delete it.
  it('scopes the on-device record to Choosees and claims only what the code can honor', () => {
    setup()

    expect(screen.getByText(/What your browser remembers about your Choosees/i)).toBeInTheDocument()
    expect(screen.getByText(/We stop using it after a day/i)).toBeInTheDocument()
    expect(screen.getByText(/clearing your browser's data for this site removes it/i)).toBeInTheDocument()
    expect(screen.queryByText(/clears itself/i)).not.toBeInTheDocument()
  })

  it('states that there is no sign-in and no account', () => {
    setup()

    expect(screen.getByText(/There's no sign-in and no account/i)).toBeInTheDocument()
  })

  // Guards against reintroducing the Google sign-in era: UserItem carries userId, name,
  // pushSubscriptions and expiration, and nothing in either repo collects an email address.
  it('makes no sign-in-era claims', () => {
    setup()

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

  // reCAPTCHA is unchanged by the removal of sign-in: post-session and get-reverse-geocode both
  // still verify a token. That processor relationship must survive, and stay scoped to reCAPTCHA.
  it('keeps reCAPTCHA and scopes the data-processor claim to it', () => {
    setup()

    expect(screen.getByText(/we use Google reCAPTCHA to verify you/i)).toBeInTheDocument()
    expect(screen.getByText(/^For reCAPTCHA, Google acts as our data processor/i)).toBeInTheDocument()
  })
})
