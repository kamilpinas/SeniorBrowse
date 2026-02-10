import { useEffect, useState } from 'react'
import { storage } from '@shared/storage'
import type { Theme } from '@shared/types'

export function applyTheme(theme: Theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light')

  // Read stored theme on mount and apply it immediately
  useEffect(() => {
    storage.local.get('config').then((cfg) => {
      const t: Theme = cfg.theme ?? 'light'
      setTheme(t)
      applyTheme(t)
    }).catch(() => {})

    // Keep in sync when another page (e.g. sidepanel) changes the theme
    const onChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area !== 'local' || !('config' in changes)) return
      const next = (changes['config']?.newValue as { theme?: Theme } | undefined)?.theme
      if (next === 'light' || next === 'dark') {
        setTheme(next)
        applyTheme(next)
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  const toggleTheme = async () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    applyTheme(next)
    await storage.local.update('config', { theme: next })
  }

  return { theme, toggleTheme }
}
