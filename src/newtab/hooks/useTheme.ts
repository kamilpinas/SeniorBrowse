import { useEffect, useState } from 'react'
import { storage } from '@shared/storage'
import { THEME_COLORS } from '@shared/constants'
import type { Theme, ThemeColor } from '@shared/types'

const COLOR_CLASS_PREFIX = 'theme-'

/** Apply brightness + colour as classes on <html>.
 *  Brightness uses the legacy `.dark` class; colour uses `.theme-<id>`
 *  (omitted for "red" which is the default palette). */
export function applyTheme(theme: Theme, color: ThemeColor) {
  const root = document.documentElement
  // Brightness
  root.classList.toggle('dark', theme === 'dark')
  // Colour — remove every theme-* class then add the chosen one (red = none).
  for (const c of THEME_COLORS) root.classList.remove(`${COLOR_CLASS_PREFIX}${c}`)
  if (color !== 'red') root.classList.add(`${COLOR_CLASS_PREFIX}${color}`)
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light')
  const [themeColor, setThemeColorState] = useState<ThemeColor>('red')

  // Read stored prefs on mount and apply them immediately
  useEffect(() => {
    storage.local.get('config').then((cfg) => {
      const t: Theme = cfg.theme ?? 'light'
      const c: ThemeColor = cfg.themeColor ?? 'red'
      setTheme(t)
      setThemeColorState(c)
      applyTheme(t, c)
    }).catch(() => {})

    // Keep in sync when another page (e.g. sidepanel) changes the theme
    const onChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area !== 'local' || !('config' in changes)) return
      const newCfg = changes['config']?.newValue as
        | { theme?: Theme; themeColor?: ThemeColor }
        | undefined
      if (!newCfg) return
      const nextT = newCfg.theme
      const nextC = newCfg.themeColor
      if (nextT === 'light' || nextT === 'dark') setTheme(nextT)
      if (nextC === 'red' || nextC === 'blue' || nextC === 'green') {
        setThemeColorState(nextC)
      }
      applyTheme(
        nextT ?? theme,
        nextC ?? themeColor,
      )
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
    // theme/themeColor are intentionally omitted — applyTheme reads from the
    // change payload directly and we don't want to re-bind the listener on
    // every state update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleTheme = async () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    applyTheme(next, themeColor)
    await storage.local.update('config', { theme: next })
  }

  const setThemeColor = async (next: ThemeColor) => {
    setThemeColorState(next)
    applyTheme(theme, next)
    await storage.local.update('config', { themeColor: next })
  }

  return { theme, themeColor, toggleTheme, setThemeColor }
}
