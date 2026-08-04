export type PushCapability = 'ready' | 'subscribed' | 'needs-install' | 'denied' | 'unsupported'

export type InstallMethod = 'prompt' | 'ios-share' | 'browser-menu' | 'installed' | 'none'

// Everything the two resolvers need, flattened to plain data so the whole matrix is table-testable
// without a browser. `permission` is null where the Notification API is absent entirely — which is
// exactly the iOS-Safari-not-installed case, and is why it must not be conflated with 'default'.
export interface CapabilityEnv {
  hasPushManager: boolean
  hasServiceWorker: boolean
  isIos: boolean
  isStandalone: boolean
  permission: NotificationPermission | null
  userAgent: string
}

const IOS_PATTERN = /iPad|iPhone|iPod/
// Instagram, Facebook, TikTok and Snapchat webviews. None can install, and most cannot push.
const IN_APP_PATTERN = /FBAN|FBAV|Instagram|TikTok|Snapchat|Line\/|MicroMessenger/
const FIREFOX_ANDROID_PATTERN = /Android.*Firefox\//

/** The only impure function here: reads the browser once so the resolvers stay pure. */
export const readCapabilityEnv = (win: Window & typeof globalThis = window): CapabilityEnv => {
  const nav = win.navigator as (Navigator & { standalone?: boolean }) | undefined
  const userAgent = nav?.userAgent ?? ''
  return {
    hasPushManager: typeof win.PushManager !== 'undefined',
    hasServiceWorker: nav !== undefined && 'serviceWorker' in nav,
    // iPadOS reports a desktop UA, so the touch-point check catches it. `maxTouchPoints > 1` is
    // false on every real Mac trackpad.
    isIos: IOS_PATTERN.test(userAgent) || (/Macintosh/.test(userAgent) && (nav as Navigator).maxTouchPoints > 1),
    isStandalone: win.matchMedia?.('(display-mode: standalone)').matches === true || nav?.standalone === true,
    permission: typeof win.Notification === 'undefined' ? null : win.Notification.permission,
    userAgent,
  }
}

export const resolvePushCapability = (env: CapabilityEnv, isSubscribed: boolean): PushCapability => {
  // The subscription is the fact, not Notification.permission. Revoking permission in browser
  // settings drops the subscription with it, so a held subscription means push is genuinely live.
  if (isSubscribed) {
    return 'subscribed'
  }
  // BEFORE the iOS branch, and that order is the fix for a real contradiction. An in-app webview is
  // a dead end on every platform: it can neither push nor install. With the iOS check first, an
  // iPhone inside Instagram resolved to `needs-install` — so we showed "iPhone needs one more step"
  // and three Add-to-Home-Screen instructions, while resolveInstallMethod independently returned
  // `none` because a webview cannot install. The user was told a path existed and then shown no
  // path. These two functions must agree about this device.
  if (IN_APP_PATTERN.test(env.userAgent)) {
    return 'unsupported'
  }
  // Ordered before the remaining support checks: on iOS Safari outside standalone there is no
  // PushManager and no Notification at all, so a support check first would report `unsupported` and
  // tell an iPhone user their browser can't do something it can — one Add to Home Screen away.
  if (env.isIos && !env.isStandalone) {
    return 'needs-install'
  }
  if (!env.hasPushManager || !env.hasServiceWorker || env.permission === null) {
    return 'unsupported'
  }
  // Terminal. Only the OS can undo a refusal, so this must never render a control that would
  // silently do nothing.
  if (env.permission === 'denied') {
    return 'denied'
  }
  return 'ready'
}

export const resolveInstallMethod = (env: CapabilityEnv, hasInstallPrompt: boolean): InstallMethod => {
  if (env.isStandalone) {
    return 'installed'
  }
  // An in-app webview can neither install nor, usually, push. Checked before everything else
  // because these UAs also contain "Chrome", which would otherwise read as Chromium.
  if (IN_APP_PATTERN.test(env.userAgent)) {
    return 'none'
  }
  // A captured beforeinstallprompt is proof, not inference — the browser has told us it will
  // install this app. Preferred over any UA guess.
  if (hasInstallPrompt) {
    return 'prompt'
  }
  if (env.isIos) {
    return 'ios-share'
  }
  // Firefox for Android installs but never fires beforeinstallprompt and has no Share sheet, so it
  // reaches neither branch above. Falling through to `none` would hide install from a browser that
  // supports it; falling through to ios-share would tell the user to tap a button that isn't there.
  if (FIREFOX_ANDROID_PATTERN.test(env.userAgent)) {
    return 'browser-menu'
  }
  // A Chromium browser that never offered a prompt has already decided this app is not installable
  // (or it is installed). Showing an entry point that cannot deliver would be worse than silence.
  return 'none'
}
