// Minimal chrome.* mock covering the surface used by background scripts.
// Each storage area is backed by its own in-memory Map so tests can assert
// on stored values without touching real chrome.storage.

import { vi } from "vitest"

function createStorageArea() {
  const data = new Map<string, unknown>()
  return {
    // Real chrome.storage.*.get() accepts a single key OR an array of keys
    // (service-worker.ts calls chrome.storage.session.get([...]) directly,
    // bypassing the @shared/storage wrapper, which only ever passes one).
    get: vi.fn(async (keys: string | string[]) => {
      const list = Array.isArray(keys) ? keys : [keys]
      const out: Record<string, unknown> = {}
      for (const k of list) if (data.has(k)) out[k] = data.get(k)
      return out
    }),
    set: vi.fn(async (items: Record<string, unknown>) => {
      for (const [k, v] of Object.entries(items)) data.set(k, v)
    }),
    remove: vi.fn(async (key: string | string[]) => {
      for (const k of Array.isArray(key) ? key : [key]) data.delete(k)
    }),
    clear: vi.fn(async () => data.clear()),
    _data: data,
  }
}

export type ChromeMock = ReturnType<typeof createChromeMock>

export function createChromeMock() {
  const onMessageListeners: Array<
    (msg: unknown, sender: unknown, sendResponse: (r: unknown) => void) => unknown
  > = []

  const local = createStorageArea()
  const session = createStorageArea()

  const mock = {
    runtime: {
      id: "test-extension-id",
      getURL: (path: string) => `chrome-extension://test-extension-id/${path}`,
      onInstalled: { addListener: vi.fn() },
      onMessage: {
        addListener: vi.fn((fn: typeof onMessageListeners[number]) => {
          onMessageListeners.push(fn)
        }),
      },
      sendMessage: vi.fn(async () => undefined),
    },
    storage: {
      local,
      session,
      onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
    },
    downloads: {
      cancel: vi.fn(async () => undefined),
      erase: vi.fn(async () => undefined),
      onCreated: { addListener: vi.fn() },
    },
    tabs: {
      query: vi.fn(async () => [] as chrome.tabs.Tab[]),
      sendMessage: vi.fn(async (_tabId: number, _message: unknown) => undefined),
      update: vi.fn(async (_tabId: number, _updateInfo: { url?: string }) => undefined),
      setZoom: vi.fn(async (_tabId: number, _zoom: number) => undefined),
      onUpdated: { addListener: vi.fn() },
    },
    windows: {
      getCurrent: vi.fn(async () => ({ id: 1 })),
    },
    sidePanel: {
      setPanelBehavior: vi.fn(async () => undefined),
      open: vi.fn(async () => undefined),
      onClosed: { addListener: vi.fn() },
      onOpened: { addListener: vi.fn() },
    },
    webNavigation: {
      onBeforeNavigate: { addListener: vi.fn() },
    },
    declarativeNetRequest: {
      updateEnabledRulesets: vi.fn(async () => undefined),
    },
    _onMessageListeners: onMessageListeners,
  }

  return mock
}

/** Installs a fresh chrome mock as the global `chrome` and returns it. */
export function installChromeMock(): ChromeMock {
  const mock = createChromeMock()
  vi.stubGlobal("chrome", mock)
  return mock
}
