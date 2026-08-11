/**
 * Turns whatever a person types or pastes into a session identifier, or into nothing.
 *
 * The two accepted inputs are the same thing wearing different clothes: the two words somebody read
 * out (`lazy giraffe`), and the link they couldn't open (`https://…/s/lazy-giraffe`). Asking which one
 * they're holding is the question this function exists to stop the UI from asking.
 */

/** Long enough for any real URL, short enough that nothing pathological reaches the work below. */
const MAX_INPUT_LENGTH = 512

const SESSION_PATH = /\/s\/([^/?#]*)/
const ABSOLUTE_URL = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i
const HOST_LIKE = /^[^/\s]+\.[^/\s]+\//

/**
 * Anything that would let the value mean something other than itself once it reaches a URL.
 *
 * `%` is the subtle one and the reason this rule terminates where it does. `%252e%252e` decodes ONCE
 * to `%2e%2e`, which contains none of the obvious offenders — and `/s/%2e%2e` resolves to `/`, because
 * the URL parser treats a percent-encoded double dot as a double-dot segment. Decoding twice does not
 * fix that; it moves the same problem up one level. Refusing a residual `%` is what ends the regress.
 *
 * `\p{C}` covers control and format characters — NUL, zero-width spaces, right-to-left overrides.
 * `\s` matches none of the last two, so without this a code could carry invisible payload into the
 * confirmation line that tells the user what was read.
 *
 * This is a safety rule, not a format rule. It says "could be a path segment that means itself", never
 * "looks like adjective-noun" — the API owns the shape, and hard-coding it here would make valid codes
 * unenterable behind a silent local refusal the day the generator changes.
 */
const UNSAFE = /[/\\\s?#.%:]|\p{C}/u

/** The part of the input that could be an identifier, before it is decoded or normalized. */
const extractCandidate = (input: string): string | undefined => {
  // A link to a Choosee, whatever origin it claims. Only the segment is taken, so a foreign origin
  // resolves to an identifier this origin will route rather than to somewhere else entirely.
  const sessionPath = SESSION_PATH.exec(input)
  if (sessionPath) return sessionPath[1]

  // A URL that isn't a Choosee link — take its last segment and let the lookup decide.
  if (ABSOLUTE_URL.test(input) || HOST_LIKE.test(input)) {
    const segments = input
      .replace(/[?#].*$/, '')
      .split('/')
      .filter(Boolean)
    return segments[segments.length - 1]
  }

  // Bare input. Deliberately returned untouched: a stray `/`, `?` or `#` in something the user typed
  // as a code is a reason to refuse it, not something to quietly strip until it parses.
  return input
}

export const parseSessionCode = (raw: string): string | undefined => {
  if (raw.length > MAX_INPUT_LENGTH) return undefined

  const trimmed = raw.trim()
  if (!trimmed) return undefined

  const candidate = extractCandidate(trimmed)
  if (!candidate) return undefined

  // Throws URIError on `50% off`, `100%`, `%zz`. Uncaught, that escapes a React event handler, where
  // ErrorBoundary cannot catch it, and the submit dies with nothing on screen to explain it.
  let decoded: string
  try {
    decoded = decodeURIComponent(candidate)
  } catch {
    return undefined
  }

  const normalized = decoded
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  if (!normalized || UNSAFE.test(normalized)) return undefined

  return normalized
}
