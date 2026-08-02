import { createContext, useCallback, useContext, useEffect, useState } from 'react'

import { InstallMethod, readCapabilityEnv, resolveInstallMethod } from '@utils/push-capability'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
}

export interface InstallPrompt {
  hasInstallPrompt: boolean
  promptInstall: () => Promise<void>
}

// Chromium fires `beforeinstallprompt` ONCE, early, and only if it considers the app installable.
// Nothing else can ask for it, so this listener has to be mounted app-wide from first render — a
// hook mounted on the winner screen would miss the event on every load that started elsewhere.
export const useInstallPrompt = (): InstallPrompt => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const capture = (event: Event): void => {
      // Suppress Chrome's own mini-infobar so the only invitation to install is ours, shown where
      // we chose to show it.
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', capture)
    return () => window.removeEventListener('beforeinstallprompt', capture)
  }, [])

  const promptInstall = useCallback(async (): Promise<void> => {
    if (!deferred) {
      return
    }
    await deferred.prompt()
    // A captured prompt is single-use — replaying it throws. Dropping it also flips
    // resolveInstallMethod away from 'prompt', which is correct: we can no longer offer a button.
    setDeferred(null)
  }, [deferred])

  return { hasInstallPrompt: deferred !== null, promptInstall }
}

// The entry points read the captured prompt from here rather than calling the hook themselves, for
// the same reason the hook lives in `_app`: a listener added after the browser has already fired
// the event never hears it. The default is the honest answer for a tree with no provider — nothing
// was captured, so there is nothing to replay.
export const InstallPromptContext = createContext<InstallPrompt>({
  hasInstallPrompt: false,
  promptInstall: () => Promise.resolve(),
})

export const useInstallPromptContext = (): InstallPrompt => useContext(InstallPromptContext)

// Resolved in an effect, never during render: `readCapabilityEnv` reads `window`, and this app is a
// static export whose first render happens in Node at build time. `none` until then, so an entry
// point that turns out to be useless is never flashed on screen first.
export const useInstallMethod = (): InstallMethod => {
  const { hasInstallPrompt } = useInstallPromptContext()
  const [method, setMethod] = useState<InstallMethod>('none')

  useEffect(() => {
    setMethod(resolveInstallMethod(readCapabilityEnv(), hasInstallPrompt))
  }, [hasInstallPrompt])

  return method
}

/** Both entry points hide themselves entirely rather than offer an install that cannot happen. */
export const canOfferInstall = (method: InstallMethod): boolean => method !== 'installed' && method !== 'none'
