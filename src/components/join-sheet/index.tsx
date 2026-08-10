import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { AlreadyJoined, JoinError, JoinField, JoinHint, JoinSheetShell, JoinSubmit, JoinSuccess } from './elements'
import { fetchSession, hasStatusCode } from '@services/api'
import { findJoinedSession } from '@utils/joined-sessions'
import { parseSessionCode } from '@utils/session-code'

const HINT_ID = 'join-hint'
const ERROR_ID = 'join-error'

const DEFAULT_HINT = 'Two words, like brave otter. A link works too.'

/** Printed with every not-found, never only when something expired — see AC-012. */
const NOT_FOUND_NOTE = 'Choosees only last 24 hours.'

interface JoinErrorState {
  message: string
  note?: string
}

export interface JoinSheetProps {
  /**
   * The identifier whose load just failed on the surface this sheet opened over.
   *
   * Suppresses the already-joined shortcut for that one code. `forgetSession` never fires from the
   * session page, so a device can hold a record for a Choosee the server has already dropped —
   * without this, someone on the error screen would submit, be handed straight back to the screen
   * they are trying to leave, and have no way out of it at all.
   */
  blockedCode?: string
  initialValue?: string
  isOpen: boolean
  onClose: () => void
}

const JoinSheet = ({ blockedCode, initialValue, isOpen, onClose }: JoinSheetProps): React.ReactNode => {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [value, setValue] = useState(initialValue ?? '')
  const [error, setError] = useState<JoinErrorState | null>(null)
  const [resolved, setResolved] = useState<string | null>(null)
  const [alreadyJoined, setAlreadyJoined] = useState<string | null>(null)

  /**
   * Focus the field, not the dialog. react-aria-components focuses the first *tabbable* element,
   * which is the close button — and the field is the only reason this dialog exists.
   *
   * A prefilled value arrives selected. It has already been proven wrong on the surface this opened
   * over, so the likely next gesture is to replace it, and a selection makes that one keystroke.
   */
  useEffect(() => {
    if (!isOpen) return
    setValue(initialValue ?? '')
    setError(null)
    setResolved(null)
    setAlreadyJoined(null)
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus()
      if (initialValue) inputRef.current?.select()
    })
    return () => cancelAnimationFrame(frame)
  }, [isOpen, initialValue])

  const goToSession = useCallback(
    (code: string) => {
      setResolved(code)
      // Encoded, not concatenated: a value that survived the guard still must not be able to mean a
      // path of its own. Matches the encoding every call in services/api already does.
      router.push(`/s/${encodeURIComponent(code)}`).then(onClose, () => {
        setResolved(null)
        setError({ message: "Couldn't open that one. Try again." })
      })
    },
    [onClose, router],
  )

  const lookup = useMutation({
    // 'always' rather than the default. A paused mutation has no cancel — it resumes on reconnect and
    // fires after the user has already retried, which is two lookups for one submission and a
    // navigation the user is no longer expecting. Erroring while offline is the honest behaviour.
    networkMode: 'always',
    mutationFn: (code: string) => fetchSession(code),
    onSuccess: (_session, code) => goToSession(code),
    onError: (err: unknown) => {
      if (hasStatusCode(err, 404)) {
        setError({ message: "Couldn't find that one. Check the words, or ask for a new one.", note: NOT_FOUND_NOTE })
      } else if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setError({ message: "Couldn't check that while you're offline. Try again when you're back online." })
      } else {
        setError({ message: "Couldn't check that just now. Try again." })
      }
      // The error is set before focus moves so the alert is queued first, then the field is focused
      // and its value selected — one gesture from retrying (AC-032).
      inputRef.current?.focus()
      inputRef.current?.select()
    },
  })

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault()
    if (lookup.isPending) return
    setError(null)

    const raw = value.trim()
    if (!raw) {
      setError({ message: 'Enter the code, or paste the link.' })
      inputRef.current?.focus()
      return
    }

    const code = parseSessionCode(raw)
    if (!code) {
      setError({ message: "That doesn't have a Choosee in it. Try the two words instead." })
      inputRef.current?.focus()
      inputRef.current?.select()
      return
    }

    // Storage only — no request at all, so this path costs zero lookups.
    if (code !== blockedCode && findJoinedSession(code)) {
      setAlreadyJoined(code)
      return
    }

    lookup.mutate(code)
  }

  // Confirmation, never a gate, and only where it earns its place: you paste a long URL and it tells
  // you which two words came out of it. Someone who typed the words can already see them, so echoing
  // a typed code back would be the app narrating itself — the difference is whether anything was
  // actually *extracted*, not whether normalising changed a character.
  const trimmed = value.trim()
  const parsed = /[/:]/.test(trimmed) ? parseSessionCode(trimmed) : undefined
  const hint = parsed ? `Going with ${parsed.replace(/-/g, ' ')}` : DEFAULT_HINT

  const renderBody = (): React.ReactNode => {
    if (alreadyJoined) {
      return (
        <AlreadyJoined
          code={alreadyJoined.replace(/-/g, ' ')}
          isLoading={Boolean(resolved)}
          onDifferent={() => {
            setAlreadyJoined(null)
            inputRef.current?.focus()
            inputRef.current?.select()
          }}
          onResume={() => goToSession(alreadyJoined)}
        />
      )
    }
    if (resolved) {
      return <JoinSuccess code={resolved.replace(/-/g, ' ')} />
    }
    return (
      <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
        <JoinField
          describedBy={error ? `${ERROR_ID} ${HINT_ID}` : HINT_ID}
          inputRef={inputRef}
          isInvalid={Boolean(error)}
          onChange={setValue}
          value={value}
        />
        {error && <JoinError id={ERROR_ID} message={error.message} note={error.note} />}
        <JoinHint id={HINT_ID} text={hint} />
        <JoinSubmit isLoading={lookup.isPending} label={error ? 'Try again' : "Let's go"} />
      </form>
    )
  }

  return (
    <JoinSheetShell isOpen={isOpen} onClose={onClose}>
      {renderBody()}
    </JoinSheetShell>
  )
}

export default JoinSheet
