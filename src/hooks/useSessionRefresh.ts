import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

/* istanbul ignore next -- SSR guard */
const resolveContainer = (): ServiceWorkerContainer | undefined =>
  typeof navigator === 'undefined' ? undefined : navigator.serviceWorker

// Tapping a notification for a session that is already open only FOCUSES that window — the worker
// deliberately does not reload it, because a reload would discard whatever the person was in the
// middle of. But focus on its own changes nothing on screen: refetchOnWindowFocus is off (see
// _app.tsx), so the page sat on the round the notification had just told them was over, until the
// poll came round. The worker therefore posts here, and the tap refreshes immediately.
export const useSessionRefresh = (
  sessionId: string,
  swContainer: ServiceWorkerContainer | undefined = resolveContainer(),
): void => {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!swContainer) {
      return undefined
    }
    const onMessage = (event: MessageEvent): void => {
      // The session id is checked even though the worker only messages a window whose path already
      // matches: two Choosees can be open at once, and nothing else tells their windows apart.
      if (event.data?.type !== 'session-refresh' || event.data?.sessionId !== sessionId) {
        return
      }
      // Both, not just the session: the voter list feeds the waiting screen's count and polls at
      // half the rate, so refreshing one alone lands the tap on a half-updated screen.
      void queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
      void queryClient.invalidateQueries({ queryKey: ['users', sessionId] })
    }
    swContainer.addEventListener('message', onMessage)
    return () => swContainer.removeEventListener('message', onMessage)
  }, [queryClient, sessionId, swContainer])
}
