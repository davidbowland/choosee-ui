import { canOfferInstall, useInstallPrompt, useInstallPromptContext } from './useInstallPrompt'
import { act, renderHook } from '@testing-library/react'
import { InstallMethod } from '@utils/push-capability'

describe('useInstallPrompt', () => {
  const mockPrompt = jest.fn()

  const fireBeforeInstallPrompt = (): void => {
    const event = new Event('beforeinstallprompt') as Event & {
      preventDefault: () => void
      prompt: () => Promise<void>
    }
    event.prompt = mockPrompt
    window.dispatchEvent(event)
  }

  beforeAll(() => {
    mockPrompt.mockResolvedValue(undefined)
  })

  it('should report no prompt before the browser offers one', () => {
    const { result } = renderHook(() => useInstallPrompt())

    expect(result.current.hasInstallPrompt).toBe(false)
  })

  it('should capture the event the browser fires', () => {
    const { result } = renderHook(() => useInstallPrompt())

    act(() => fireBeforeInstallPrompt())

    expect(result.current.hasInstallPrompt).toBe(true)
  })

  it('should replay the captured prompt on request', async () => {
    const { result } = renderHook(() => useInstallPrompt())
    act(() => fireBeforeInstallPrompt())

    await act(() => result.current.promptInstall())

    expect(mockPrompt).toHaveBeenCalledTimes(1)
  })

  it('should forget the prompt after it is used, since it cannot be replayed twice', async () => {
    const { result } = renderHook(() => useInstallPrompt())
    act(() => fireBeforeInstallPrompt())

    await act(() => result.current.promptInstall())

    expect(result.current.hasInstallPrompt).toBe(false)
  })

  it('should do nothing when asked to prompt with no captured event', async () => {
    const { result } = renderHook(() => useInstallPrompt())

    await act(() => result.current.promptInstall())

    expect(mockPrompt).not.toHaveBeenCalled()
  })

  describe('useInstallPromptContext', () => {
    it('should report no prompt outside a provider', () => {
      const { result } = renderHook(() => useInstallPromptContext())

      expect(result.current.hasInstallPrompt).toBe(false)
    })

    it('should resolve without prompting outside a provider', async () => {
      const { result } = renderHook(() => useInstallPromptContext())

      await expect(result.current.promptInstall()).resolves.toBeUndefined()
    })
  })

  describe('canOfferInstall', () => {
    it.each<InstallMethod>(['prompt', 'ios-share', 'browser-menu'])('should offer install on %s', (method) => {
      expect(canOfferInstall(method)).toBe(true)
    })

    it.each<InstallMethod>(['installed', 'none'])('should hide install on %s', (method) => {
      expect(canOfferInstall(method)).toBe(false)
    })
  })
})
