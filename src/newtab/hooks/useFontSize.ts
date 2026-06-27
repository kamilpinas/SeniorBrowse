// Reads currentFontSize from session storage and applies browser-level zoom
// to <html> before the first paint. Also detects when the senior changed the
// font last session and returns a recovery prompt flag.
//
// Zoom is applied via document.documentElement.style.zoom (same scale as
// chrome.tabs.setZoom) so it works on extension pages where setZoom is
// unavailable. A storage.onChanged listener keeps it in sync when the side
// panel cycles text size while the new tab is the active page.

import { useEffect, useState } from 'react'
import { storage } from '@shared/storage'
import type { FontSize } from '@shared/types'

const ZOOM_FACTOR: Record<FontSize, number> = { normal: 1, large: 1.25, xlarge: 1.5 }

function applyZoom(size: FontSize) {
  const factor = ZOOM_FACTOR[size] ?? 1
  document.documentElement.style.zoom = factor === 1 ? '' : String(factor)
}

export interface FontSizeState {
  /** The font size currently active this session. */
  current: FontSize
  /**
   * True when the senior changed the font last session and it differs from the
   * caregiver's default. Shows the recovery prompt.
   */
  showRecoveryPrompt: boolean
  /** Dismiss the prompt without changing anything. */
  dismissRecovery: () => void
  /** Revert to the caregiver's defaultFontSize. */
  revertToDefault: () => Promise<void>
}

export function useFontSize(): FontSizeState {
  const [current, setCurrent] = useState<FontSize>('normal')
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false)
  const [defaultSize, setDefaultSize] = useState<FontSize>('normal')

  useEffect(() => {
    // Live listener — fires when the side panel cycles font size while this
    // tab is active (extension pages can't use chrome.tabs.setZoom, so we
    // rely on the storage change instead).
    const onChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area !== 'session' || !('currentFontSize' in changes)) return
      const size = (changes['currentFontSize']?.newValue as FontSize) ?? 'normal'
      applyZoom(size)
      setCurrent(size)
    }
    chrome.storage.onChanged.addListener(onChange)

    // Initial setup — reset to caregiver default and detect size mismatch.
    ;(async () => {
      try {
        const [session, config] = await Promise.all([
          storage.session.get('currentFontSize'),
          storage.local.get('config'),
        ])

        const def = config.defaultFontSize
        setDefaultSize(def)

        // Use whatever is already set in session (senior may have changed it via
        // the panel earlier in this same Chrome session). Only fall back to the
        // caregiver's default when the session key is null, meaning this is a
        // brand-new browser session and no font choice has been made yet.
        // Never overwrite a non-null session value — that was a real bug previously.
        const active: FontSize = (session ?? def) as FontSize
        if (session === null) {
          // First new-tab of a fresh browser session — seed the session key.
          await storage.session.set('currentFontSize', active)
        }
        applyZoom(active)
        setCurrent(active)

        // Show the recovery prompt when the current session size differs from
        // the caregiver's configured default. This lets the caregiver (or senior)
        // reset back to normal if text got accidentally enlarged.
        if (active !== def) {
          await storage.session.set('previousFontSize', active)
          setShowRecoveryPrompt(true)
        }
      } catch {
        // Silent — fallback to 'normal' already set by useState
      }
    })()

    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  const dismissRecovery = () => setShowRecoveryPrompt(false)

  const revertToDefault = async () => {
    applyZoom(defaultSize)
    setCurrent(defaultSize)
    await storage.session.set('currentFontSize', defaultSize)
    setShowRecoveryPrompt(false)
  }

  return { current, showRecoveryPrompt, dismissRecovery, revertToDefault }
}
