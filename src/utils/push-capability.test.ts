import { CapabilityEnv, readCapabilityEnv, resolveInstallMethod, resolvePushCapability } from './push-capability'

const envOf = (overrides: Partial<CapabilityEnv> = {}): CapabilityEnv => ({
  hasPushManager: true,
  hasServiceWorker: true,
  isIos: false,
  isStandalone: false,
  permission: 'default',
  userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/120',
  ...overrides,
})

interface FakeNavigator {
  maxTouchPoints?: number
  serviceWorker?: unknown
  standalone?: boolean
  userAgent?: string
}

interface FakeWindow {
  Notification?: { permission: NotificationPermission }
  PushManager?: unknown
  matchMedia?: () => { matches: boolean }
  navigator?: FakeNavigator
}

const ANDROID_CHROME = 'Mozilla/5.0 (Linux; Android 14) Chrome/120'
const DESKTOP_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15'

/** A plain stand-in for `window`, holding only the handful of properties the reader touches. */
const winOf = (overrides: FakeWindow = {}): Window & typeof globalThis =>
  ({
    Notification: { permission: 'default' },
    PushManager: class {},
    matchMedia: () => ({ matches: false }),
    navigator: { maxTouchPoints: 0, serviceWorker: {}, userAgent: ANDROID_CHROME },
    ...overrides,
  }) as unknown as Window & typeof globalThis

describe('push-capability', () => {
  describe('resolvePushCapability', () => {
    it('should report subscribed when this device already holds a subscription', () => {
      expect(resolvePushCapability(envOf(), true)).toEqual('subscribed')
    })

    it('should report subscribed even where the browser looks unsupported', () => {
      // The subscription is the fact. If one exists, something clearly worked.
      expect(resolvePushCapability(envOf({ hasPushManager: false }), true)).toEqual('subscribed')
    })

    it('should report ready on a capable browser that has not been asked', () => {
      expect(resolvePushCapability(envOf(), false)).toEqual('ready')
    })

    it('should report ready when permission was already granted but no subscription exists', () => {
      expect(resolvePushCapability(envOf({ permission: 'granted' }), false)).toEqual('ready')
    })

    it('should report denied when permission was refused', () => {
      expect(resolvePushCapability(envOf({ permission: 'denied' }), false)).toEqual('denied')
    })

    it('should report unsupported without a PushManager', () => {
      expect(resolvePushCapability(envOf({ hasPushManager: false }), false)).toEqual('unsupported')
    })

    it('should report unsupported without a service worker container', () => {
      expect(resolvePushCapability(envOf({ hasServiceWorker: false }), false)).toEqual('unsupported')
    })

    it('should report unsupported where the Notification API is absent entirely', () => {
      expect(resolvePushCapability(envOf({ permission: null }), false)).toEqual('unsupported')
    })

    it('should report needs-install on iOS Safari outside standalone', () => {
      expect(resolvePushCapability(envOf({ hasPushManager: false, isIos: true, permission: null }), false)).toEqual(
        'needs-install',
      )
    })

    it('should report ready on iOS once running standalone', () => {
      expect(resolvePushCapability(envOf({ isIos: true, isStandalone: true }), false)).toEqual('ready')
    })

    it('should report denied on installed iOS where permission was refused', () => {
      expect(resolvePushCapability(envOf({ isIos: true, isStandalone: true, permission: 'denied' }), false)).toEqual(
        'denied',
      )
    })
  })

  // These two cases exist because the two resolvers must agree about the same device. An earlier
  // ordering returned `needs-install` here while resolveInstallMethod returned `none`, so the UI
  // promised an Add-to-Home-Screen path and then rendered no way to take it.
  describe('agreement with resolveInstallMethod', () => {
    const instagramOnIphone = envOf({
      hasPushManager: false,
      isIos: true,
      permission: null,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Instagram 300.0.0.0',
    })

    it('should report an iOS in-app webview as unsupported, not as one install away', () => {
      expect(resolvePushCapability(instagramOnIphone, false)).toEqual('unsupported')
    })

    it('should not offer an install method for the device it just called unsupported', () => {
      expect(resolveInstallMethod(instagramOnIphone, false)).toEqual('none')
    })

    it('should still report a plain iOS Safari tab as one install away', () => {
      const safariOnIphone = envOf({
        hasPushManager: false,
        isIos: true,
        permission: null,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Safari',
      })

      expect(resolvePushCapability(safariOnIphone, false)).toEqual('needs-install')
      expect(resolveInstallMethod(safariOnIphone, false)).toEqual('ios-share')
    })
  })

  describe('resolveInstallMethod', () => {
    it('should report installed when already running standalone', () => {
      expect(resolveInstallMethod(envOf({ isStandalone: true }), true)).toEqual('installed')
    })

    it('should report prompt when a captured beforeinstallprompt is available', () => {
      expect(resolveInstallMethod(envOf(), true)).toEqual('prompt')
    })

    it('should report ios-share on iOS', () => {
      expect(resolveInstallMethod(envOf({ isIos: true }), false)).toEqual('ios-share')
    })

    it('should prefer the captured prompt over the iOS share sheet', () => {
      // A captured beforeinstallprompt is proof; the user agent is only ever inference.
      expect(resolveInstallMethod(envOf({ isIos: true }), true)).toEqual('prompt')
    })

    it('should report browser-menu on Firefox for Android, which never fires beforeinstallprompt', () => {
      const firefoxAndroid = 'Mozilla/5.0 (Android 14; Mobile; rv:130.0) Gecko/130.0 Firefox/130.0'

      expect(resolveInstallMethod(envOf({ userAgent: firefoxAndroid }), false)).toEqual('browser-menu')
    })

    it('should report none on desktop Firefox, which cannot install at all', () => {
      const firefoxDesktop = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:130.0) Gecko/20100101 Firefox/130.0'

      expect(resolveInstallMethod(envOf({ userAgent: firefoxDesktop }), false)).toEqual('none')
    })

    it('should report none on a Chromium browser that never offered a prompt', () => {
      expect(resolveInstallMethod(envOf(), false)).toEqual('none')
    })

    it('should report none inside an in-app webview', () => {
      const instagram = 'Mozilla/5.0 (Linux; Android 14) Chrome/120 Instagram 300.0.0.0'

      expect(resolveInstallMethod(envOf({ userAgent: instagram }), false)).toEqual('none')
    })

    it('should report none inside a Facebook webview even where a prompt was captured', () => {
      // These user agents also contain "Chrome", so the webview check has to come first.
      const facebook = 'Mozilla/5.0 (Linux; Android 14) Chrome/120 [FBAN/FB4A;FBAV/450.0.0.0;]'

      expect(resolveInstallMethod(envOf({ userAgent: facebook }), true)).toEqual('none')
    })
  })

  describe('readCapabilityEnv', () => {
    it('should read a fully capable browser', () => {
      expect(readCapabilityEnv(winOf())).toEqual({
        hasPushManager: true,
        hasServiceWorker: true,
        isIos: false,
        isStandalone: false,
        permission: 'default',
        userAgent: ANDROID_CHROME,
      })
    })

    it('should report no push manager where the global is absent', () => {
      expect(readCapabilityEnv(winOf({ PushManager: undefined })).hasPushManager).toEqual(false)
    })

    it('should report no service worker where the container is absent', () => {
      const win = winOf({ navigator: { maxTouchPoints: 0, userAgent: ANDROID_CHROME } })

      expect(readCapabilityEnv(win).hasServiceWorker).toEqual(false)
    })

    it('should fall back to an empty user agent where navigator is absent', () => {
      expect(readCapabilityEnv(winOf({ navigator: undefined }))).toEqual({
        hasPushManager: true,
        hasServiceWorker: false,
        isIos: false,
        isStandalone: false,
        permission: 'default',
        userAgent: '',
      })
    })

    it('should detect iOS from the user agent', () => {
      const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1'
      const win = winOf({ navigator: { maxTouchPoints: 5, serviceWorker: {}, userAgent: iphone } })

      expect(readCapabilityEnv(win).isIos).toEqual(true)
    })

    it('should detect iPadOS, which reports a desktop user agent, from its touch points', () => {
      const win = winOf({ navigator: { maxTouchPoints: 5, serviceWorker: {}, userAgent: DESKTOP_MAC } })

      expect(readCapabilityEnv(win).isIos).toEqual(true)
    })

    it('should not mistake a Mac trackpad for iPadOS', () => {
      const win = winOf({ navigator: { maxTouchPoints: 0, serviceWorker: {}, userAgent: DESKTOP_MAC } })

      expect(readCapabilityEnv(win).isIos).toEqual(false)
    })

    it('should detect standalone from the display-mode media query', () => {
      expect(readCapabilityEnv(winOf({ matchMedia: () => ({ matches: true }) })).isStandalone).toEqual(true)
    })

    it('should detect standalone from navigator.standalone on iOS', () => {
      const win = winOf({
        navigator: { maxTouchPoints: 5, serviceWorker: {}, standalone: true, userAgent: ANDROID_CHROME },
      })

      expect(readCapabilityEnv(win).isStandalone).toEqual(true)
    })

    it('should detect standalone where matchMedia is unavailable', () => {
      const win = winOf({
        matchMedia: undefined,
        navigator: { maxTouchPoints: 5, serviceWorker: {}, standalone: true, userAgent: ANDROID_CHROME },
      })

      expect(readCapabilityEnv(win).isStandalone).toEqual(true)
    })

    it('should report a null permission where the Notification API is absent', () => {
      // Exactly the iOS-Safari-not-installed case, which must not be conflated with 'default'.
      expect(readCapabilityEnv(winOf({ Notification: undefined })).permission).toEqual(null)
    })

    it('should read the granted permission from the Notification API', () => {
      expect(readCapabilityEnv(winOf({ Notification: { permission: 'granted' } })).permission).toEqual('granted')
    })

    it('should default to the ambient window', () => {
      expect(readCapabilityEnv()).toEqual(readCapabilityEnv(window))
    })
  })
})
