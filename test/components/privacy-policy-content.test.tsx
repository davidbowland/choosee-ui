import React from 'react'

import PrivacyPolicy from '@components/privacy-policy'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

describe('PrivacyPolicy content', () => {
  const setup = (): void => {
    render(<PrivacyPolicy />)
  }

  // useSessionCookie writes one cookie per Choosee: name `choosee_user_<sessionId>`, path
  // `/s/<sessionId>`, expires in 1 day. The policy has to describe that cookie, not a vaguer one.
  it('describes the session cookie by name, scope, and lifetime', () => {
    setup()

    expect(screen.getByText(/choosee_user_/)).toBeInTheDocument()
    expect(screen.getByText(/sends it back on those pages and nowhere else/i)).toBeInTheDocument()
    expect(screen.getByText(/expires a day after it/i)).toBeInTheDocument()
  })

  // pushManager.subscribe() mints a URL bound to one browser on one device. Nothing in
  // UserItem ties it to a person, and post-push-subscription is unauthenticated for that reason.
  it('describes a push subscription as identifying a browser rather than a person', () => {
    setup()

    expect(screen.getByText(/identifies one browser on one device, not a person/i)).toBeInTheDocument()
    expect(screen.getByText(/no name, no\s+address, and no account attached to it/i)).toBeInTheDocument()
  })

  // unsubscribeFromPush unsubscribes the browser and then DELETEs the stored copy, and the user
  // row TTLs with its session either way.
  it('states that turning notifications off deletes the subscription', () => {
    setup()

    expect(screen.getByText(/Turning notifications off deletes it too/i)).toBeInTheDocument()
    expect(screen.getByText(/it dies when the Choosee expires/i)).toBeInTheDocument()
  })

  it('states that nothing is sent until notifications are switched on', () => {
    setup()

    expect(screen.getByText(/We send nothing until you\s+switch it on/i)).toBeInTheDocument()
  })

  // GET /reverse-geocode takes latitude and longitude as query parameters, and redactEvent keeps
  // query parameters. Only the resolved address is stored, but the coordinates are logged.
  it('discloses that coordinates from Use my location reach the server logs', () => {
    setup()

    expect(screen.getByText(/the coordinates do reach our server logs/i)).toBeInTheDocument()
  })

  // RetentionInDays: 30 on every log group; SESSION_EXPIRE_HOURS: '24'.
  it('states the retention periods for logs and for a Choosee', () => {
    setup()

    expect(screen.getByText(/Server logs are deleted automatically after 30 days/i)).toBeInTheDocument()
    expect(screen.getByText(/24 hours\s+after it/i)).toBeInTheDocument()
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
