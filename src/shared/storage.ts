// Thin typed wrapper around chrome.storage.local and chrome.storage.session.

import { DEFAULT_CONFIG } from './constants'
import type {
  ActivityLogEntry,
  Config,
  FontSize,
  SavedLink,
  Shortcut,
} from './types'

/** Persisted PIN brute-force counter — survives reload/restart so a wrong
 *  PIN streak can't be reset just by closing the browser (see AdminPinModal). */
export interface PinLockoutState {
  failCount: number
  /** Epoch ms; null when not currently locked. */
  lockedUntil: number | null
}

export interface LocalStore {
  config: Config
  shortcuts: Shortcut[]
  savedLinks: SavedLink[]
  activityLog: ActivityLogEntry[]
  pinLockout: PinLockoutState
}

export interface SessionStore {
  currentFontSize: FontSize | null
  previousFontSize: FontSize | null
  adminModeActive: boolean
  /** URLs the user explicitly chose to bypass (safe-browsing warn page). */
  bypassedUrls: string[]
}

export type DeepPartial<T> = T extends ReadonlyArray<unknown>
  ? T
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T

export interface StorageArea<T extends object> {
  get<K extends keyof T>(key: K): Promise<T[K]>
  set<K extends keyof T>(key: K, value: T[K]): Promise<void>
  update<K extends keyof T>(key: K, partial: DeepPartial<T[K]>): Promise<T[K]>
  remove<K extends keyof T>(key: K): Promise<void>
  clear(): Promise<void>
}

const DEFAULTS: { local: LocalStore; session: SessionStore } = {
  local: {
    config: DEFAULT_CONFIG,
    shortcuts: [],
    savedLinks: [],
    activityLog: [],
    pinLockout: { failCount: 0, lockedUntil: null },
  },
  session: {
    currentFontSize: null,
    previousFontSize: null,
    adminModeActive: false,
    bypassedUrls: [],
  },
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype
}

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...target }
  for (const key of Object.keys(source)) {
    const tv = target[key]
    const sv = source[key]
    out[key] =
      isPlainObject(tv) && isPlainObject(sv) ? deepMerge(tv, sv) : sv
  }
  return out
}

function clone<T>(v: T): T {
  return v === undefined ? v : (structuredClone(v) as T)
}

interface RawArea {
  get(key: string): Promise<Record<string, unknown>>
  set(items: Record<string, unknown>): Promise<void>
  remove(key: string | string[]): Promise<void>
  clear(): Promise<void>
}

const memFallback = new Map<string, Map<string, unknown>>()

function getRawApi(areaName: 'local' | 'session'): RawArea {
  if (typeof chrome !== 'undefined' && chrome.storage?.[areaName]) {
    return chrome.storage[areaName] as unknown as RawArea
  }
  if (!memFallback.has(areaName)) {
    console.warn(
      `[SeniorBrowse] chrome.storage.${areaName} not available — using in-memory fallback (dev mode)`,
    )
    memFallback.set(areaName, new Map())
  }
  const map = memFallback.get(areaName)!
  return {
    async get(key) {
      return map.has(key) ? { [key]: map.get(key) } : {}
    },
    async set(items) {
      for (const [k, v] of Object.entries(items)) map.set(k, v)
    },
    async remove(key) {
      const keys = Array.isArray(key) ? key : [key]
      for (const k of keys) map.delete(k)
    },
    async clear() {
      map.clear()
    },
  }
}

function makeArea<T extends object>(
  areaName: 'local' | 'session',
  defaults: T,
): StorageArea<T> {
  const api = getRawApi(areaName)

  async function get<K extends keyof T>(key: K): Promise<T[K]> {
    const result = await api.get(String(key))
    const stored = result[key as string] as T[K] | undefined
    const defaultValue = defaults[key]
    if (stored === undefined) return clone(defaultValue)
    if (isPlainObject(defaultValue) && isPlainObject(stored)) {
      return deepMerge(clone(defaultValue), stored) as T[K]
    }
    return stored
  }

  async function set<K extends keyof T>(key: K, value: T[K]): Promise<void> {
    await api.set({ [key as string]: value })
  }

  async function update<K extends keyof T>(
    key: K,
    partial: DeepPartial<T[K]>,
  ): Promise<T[K]> {
    const current = await get(key)
    let next: T[K]
    if (isPlainObject(current) && isPlainObject(partial)) {
      next = deepMerge(current, partial) as T[K]
    } else {
      next = partial as unknown as T[K]
    }
    await api.set({ [key as string]: next })
    return next
  }

  async function remove<K extends keyof T>(key: K): Promise<void> {
    await api.remove(String(key))
  }

  async function clear(): Promise<void> {
    await api.clear()
  }

  return { get, set, update, remove, clear }
}

export const storage: {
  local: StorageArea<LocalStore>
  session: StorageArea<SessionStore>
} = {
  local: makeArea<LocalStore>('local', DEFAULTS.local),
  session: makeArea<SessionStore>('session', DEFAULTS.session),
}

type StorageChanges = Record<string, chrome.storage.StorageChange>
export type StorageChangeHandler = (
  changes: StorageChanges,
  area: 'local' | 'session',
) => void

export function onChanged(handler: StorageChangeHandler): () => void {
  if (typeof chrome === 'undefined' || !chrome.storage?.onChanged) {
    return () => {}
  }
  const listener = (changes: StorageChanges, areaName: string) => {
    if (areaName === 'local' || areaName === 'session') {
      handler(changes, areaName)
    }
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}
