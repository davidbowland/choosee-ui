import { parseSessionCode } from '@utils/session-code'

describe('parseSessionCode', () => {
  describe('bare codes', () => {
    it.each([
      ['lazy-giraffe', 'lazy-giraffe'],
      ['lazy giraffe', 'lazy-giraffe'],
      ['LAZY GIRAFFE', 'lazy-giraffe'],
      ['Lazy-Giraffe', 'lazy-giraffe'],
      ['  lazy-giraffe  ', 'lazy-giraffe'],
      ['lazy_giraffe', 'lazy-giraffe'],
      ['lazy   giraffe', 'lazy-giraffe'],
      ['lazy--giraffe', 'lazy-giraffe'],
      ['-lazy-giraffe-', 'lazy-giraffe'],
      ['\tlazy giraffe\n', 'lazy-giraffe'],
    ])('reads %p as %p', (input, expected) => {
      expect(parseSessionCode(input)).toBe(expected)
    })

    // The guard must not encode the API's adjective-noun shape, or a generator change
    // would make real codes unenterable behind a silent local refusal.
    it.each([['brave-otter-cub'], ['code42'], ['a-b']])('accepts %p without asserting a word shape', (input) => {
      expect(parseSessionCode(input)).toBe(input)
    })
  })

  describe('pasted links', () => {
    it.each([
      ['/s/lazy-giraffe', 'lazy-giraffe'],
      ['/s/lazy-giraffe/', 'lazy-giraffe'],
      ['https://choosee.dbowland.com/s/lazy-giraffe', 'lazy-giraffe'],
      ['https://choosee.dbowland.com/s/lazy-giraffe/', 'lazy-giraffe'],
      ['http://localhost:3000/s/lazy-giraffe', 'lazy-giraffe'],
      ['choosee.dbowland.com/s/lazy-giraffe', 'lazy-giraffe'],
      ['https://choosee.dbowland.com/s/lazy-giraffe?id=brave-otter', 'lazy-giraffe'],
      ['https://choosee.dbowland.com/s/lazy-giraffe#top', 'lazy-giraffe'],
      ['https://choosee.dbowland.com/s/LAZY-GIRAFFE', 'lazy-giraffe'],
    ])('extracts the identifier from %p', (input, expected) => {
      expect(parseSessionCode(input)).toBe(expected)
    })

    // AC-013: a foreign origin resolves to an identifier this origin will route, never off-site.
    it('takes only the identifier from a foreign origin', () => {
      expect(parseSessionCode('https://evil.example.com/s/lazy-giraffe')).toBe('lazy-giraffe')
    })

    it('takes the last segment of a URL with no /s/ path', () => {
      expect(parseSessionCode('https://choosee.dbowland.com/lazy-giraffe')).toBe('lazy-giraffe')
    })
  })

  describe('refuses input it cannot turn into one safe segment', () => {
    it.each([
      ['', 'empty'],
      ['   ', 'whitespace only'],
      ['-', 'separator only'],
      ['___', 'separators only'],
      ['///', 'slashes only'],
      ['lazy/giraffe', 'an interior slash in a bare code'],
      ['lazy\\giraffe', 'a backslash'],
      ['../etc/passwd', 'a traversal'],
      ['javascript:alert(1)', 'a script scheme'],
      ['data:text/html,x', 'a data scheme'],
    ])('refuses %p — %s', (input) => {
      expect(parseSessionCode(input)).toBeUndefined()
    })

    // decodeURIComponent throws URIError on these. Uncaught inside a React event handler,
    // ErrorBoundary does not catch it and submit dies silently.
    it.each([['50% off'], ['100%'], ['%zz'], ['a%e0%a4%a']])(
      'returns undefined rather than throwing on %p',
      (input) => {
        expect(() => parseSessionCode(input)).not.toThrow()
        expect(parseSessionCode(input)).toBeUndefined()
      },
    )

    // %252e%252e decodes ONCE to %2e%2e, which contains none of / \ whitespace ? # . —
    // and /s/%2e%2e resolves to /. Rejecting a residual % is the terminating rule.
    it.each([['%2e%2e%2fadmin'], ['%252e%252e'], ['%2e%2e'], ['%2f%2f']])(
      'refuses the encoded traversal %p',
      (input) => {
        expect(parseSessionCode(input)).toBeUndefined()
      },
    )

    // \s matches neither U+200B nor U+202E, so these need the Unicode-category-C rule.
    it.each([
      ['lazy%00giraffe', 'a null byte'],
      ['lazy​giraffe', 'a zero-width space'],
      ['lazy‮giraffe', 'a right-to-left override'],
      ['lazygiraffe', 'a control character'],
    ])('refuses %p — %s', (input) => {
      expect(parseSessionCode(input)).toBeUndefined()
    })

    it('refuses input longer than the cap', () => {
      expect(parseSessionCode('a'.repeat(1000))).toBeUndefined()
    })
  })

  describe('protocol-relative input', () => {
    // Safe either way: the caller prefixes /s/, so the result can only ever be same-origin.
    it('takes the identifier from a protocol-relative link', () => {
      expect(parseSessionCode('//evil.example.com/s/lazy-giraffe')).toBe('lazy-giraffe')
    })
  })

  describe('round-trips what the inviter is shown', () => {
    // AC-027: the QR modal displays the identifier space-separated, so what a person reads
    // aloud and what the field accepts must be the same thing.
    it.each([['lazy giraffe'], ['lazy-giraffe'], ['Lazy Giraffe'], [' lazy giraffe ']])(
      'resolves the displayed form %p to the stored form',
      (displayed) => {
        expect(parseSessionCode(displayed)).toBe('lazy-giraffe')
      },
    )
  })
})
