// Covers the remaining chrome.* event listeners registered at the top of
// service-worker.ts that aren't exercised by messageValidation.test.ts or
// navigationFilter.test.ts: onInstalled seeding, the OPEN_SIDE_PANEL
// fast-path listener, tabs.onUpdated (activity log + panel-state push +
// zoom restore), the storage.onChanged → ad-block sync, and the
// sidePanel onClosed/onOpened broadcast.

import { describe, it, expect, vi } from "vitest"
import { installChromeMock } from "../../__tests__/helpers/chromeMock"

vi.mock("../safetyCheck", () => ({
  checkUrl: vi.fn(async () => "safe" as const),
}))

async function loadServiceWorker() {
  vi.resetModules()
  const mock = installChromeMock()
  await import("../service-worker")
  const { storage } = await import("@shared/storage")
  return { mock, storage }
}

function getListener<T extends (...args: never[]) => unknown>(
  fn: { mock: { calls: unknown[][] } },
  index = 0,
): T {
  return fn.mock.calls[index]![0] as T
}

describe("onInstalled", () => {
  it("seeds the default config and a fresh installId on first install", async () => {
    const { mock, storage } = await loadServiceWorker()
    const onInstalled = getListener<(d: { reason: string }) => Promise<void>>(
      mock.runtime.onInstalled.addListener,
    )

    await onInstalled({ reason: "install" })

    await expect(storage.local.get("installId")).resolves.not.toBe("")
    const config = await storage.local.get("config")
    expect(config.security.blockDownloads).toBe(true)
  })

  it("does not overwrite an existing installId on install", async () => {
    const { mock, storage } = await loadServiceWorker()
    await storage.local.set("installId", "existing-id")
    const onInstalled = getListener<(d: { reason: string }) => Promise<void>>(
      mock.runtime.onInstalled.addListener,
    )

    await onInstalled({ reason: "install" })

    await expect(storage.local.get("installId")).resolves.toBe("existing-id")
  })

  it("syncs ad-blocking from the seeded config's blockAds flag", async () => {
    const { mock } = await loadServiceWorker()
    const onInstalled = getListener<(d: { reason: string }) => Promise<void>>(
      mock.runtime.onInstalled.addListener,
    )
    await onInstalled({ reason: "install" })
    expect(mock.declarativeNetRequest.updateEnabledRulesets).toHaveBeenCalledWith(
      expect.objectContaining({ enableRulesetIds: ["ad_block_rules"] }),
    )
  })

  it("does not re-seed config/installId on a plain update (not a fresh install)", async () => {
    const { mock } = await loadServiceWorker()
    const onInstalled = getListener<(d: { reason: string }) => Promise<void>>(
      mock.runtime.onInstalled.addListener,
    )

    await onInstalled({ reason: "update" })

    // installId is seeded by the module-level top-of-file effect regardless
    // (guards against cleared storage), but onInstalled itself must not be
    // the thing forcing a re-seed on "update" — config write only happens
    // inside the `reason === "install"` branch.
    const setCalls = mock.storage.local.set.mock.calls.map((c) => Object.keys(c[0] as object))
    expect(setCalls.some((keys) => keys.includes("config"))).toBe(false)
  })

  it("does not throw when sidePanel.setPanelBehavior is unsupported", async () => {
    const { mock } = await loadServiceWorker()
    mock.sidePanel.setPanelBehavior.mockRejectedValueOnce(new Error("unsupported"))
    const onInstalled = getListener<(d: { reason: string }) => Promise<void>>(
      mock.runtime.onInstalled.addListener,
    )
    await expect(onInstalled({ reason: "install" })).resolves.toBeUndefined()
  })
})

describe("OPEN_SIDE_PANEL fast-path listener", () => {
  it("opens the panel using sender.tab.windowId when present (content script)", async () => {
    const { mock } = await loadServiceWorker()
    const listener = mock._onMessageListeners[0]!
    const sendResponse = vi.fn()

    listener({ type: "OPEN_SIDE_PANEL" }, { tab: { id: 5, windowId: 42 } }, sendResponse)

    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalled())
    expect(mock.sidePanel.open).toHaveBeenCalledWith({ windowId: 42 })
    expect(sendResponse).toHaveBeenCalledWith({ ok: true, data: undefined })
  })

  it("falls back to the focused window when sender.tab is absent (extension page)", async () => {
    const { mock } = await loadServiceWorker()
    mock.windows.getCurrent.mockResolvedValueOnce({ id: 7 })
    const listener = mock._onMessageListeners[0]!
    const sendResponse = vi.fn()

    listener({ type: "OPEN_SIDE_PANEL" }, {}, sendResponse)

    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalled())
    expect(mock.sidePanel.open).toHaveBeenCalledWith({ windowId: 7 })
  })

  it("responds with ok:false when sidePanel.open() rejects", async () => {
    const { mock } = await loadServiceWorker()
    mock.sidePanel.open.mockRejectedValueOnce(new Error("boom"))
    const listener = mock._onMessageListeners[0]!
    const sendResponse = vi.fn()

    listener({ type: "OPEN_SIDE_PANEL" }, { tab: { id: 1, windowId: 1 } }, sendResponse)

    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalled())
    expect(sendResponse).toHaveBeenCalledWith({ ok: false, error: expect.stringContaining("boom") })
  })

  it("ignores non-OPEN_SIDE_PANEL messages (leaves them for the main handler)", async () => {
    const { mock } = await loadServiceWorker()
    const listener = mock._onMessageListeners[0]!
    const sendResponse = vi.fn()
    listener({ type: "TOGGLE_ADMIN_MODE" }, {}, sendResponse)
    expect(sendResponse).not.toHaveBeenCalled()
  })

  it("ignores a null message without throwing", async () => {
    const { mock } = await loadServiceWorker()
    const listener = mock._onMessageListeners[0]!
    expect(() => listener(null, {}, vi.fn())).not.toThrow()
  })
})

describe("tabs.onUpdated — activity logging", () => {
  it("logs a visit once the tab finishes loading an http(s) page", async () => {
    const { mock, storage } = await loadServiceWorker()
    const listener = getListener<
      (tabId: number, info: { status?: string }, tab: chrome.tabs.Tab) => Promise<void>
    >(mock.tabs.onUpdated.addListener)

    await listener(1, { status: "complete" }, { url: "https://example.com", title: "Example" } as chrome.tabs.Tab)

    const log = await storage.local.get("activityLog")
    expect(log).toHaveLength(1)
    expect(log[0]).toMatchObject({ url: "https://example.com", title: "Example", type: "visit" })
  })

  it("does not log while the tab is still loading", async () => {
    const { mock, storage } = await loadServiceWorker()
    const listener = getListener<
      (tabId: number, info: { status?: string }, tab: chrome.tabs.Tab) => Promise<void>
    >(mock.tabs.onUpdated.addListener)

    await listener(1, { status: "loading" }, { url: "https://example.com" } as chrome.tabs.Tab)

    await expect(storage.local.get("activityLog")).resolves.toEqual([])
  })

  it("does not log internal extension/chrome:// pages", async () => {
    const { mock, storage } = await loadServiceWorker()
    const listener = getListener<
      (tabId: number, info: { status?: string }, tab: chrome.tabs.Tab) => Promise<void>
    >(mock.tabs.onUpdated.addListener)

    await listener(1, { status: "complete" }, { url: "chrome://settings" } as chrome.tabs.Tab)

    await expect(storage.local.get("activityLog")).resolves.toEqual([])
  })
})

describe("tabs.onUpdated — panel-state push and zoom restore", () => {
  it("pushes PANEL_STATE to the freshly-loaded tab when a panel state is known", async () => {
    const { mock } = await loadServiceWorker()
    // panelOpen lives outside the typed SessionStore — service-worker.ts
    // reads/writes it via the raw chrome.storage.session API directly.
    await mock.storage.session.set({ panelOpen: true })
    const listener = getListener<
      (tabId: number, info: { status?: string }, tab: chrome.tabs.Tab) => Promise<void>
    >(mock.tabs.onUpdated.addListener)

    await listener(9, { status: "complete" }, { url: "https://example.com" } as chrome.tabs.Tab)

    expect(mock.tabs.sendMessage).toHaveBeenCalledWith(9, { type: "PANEL_STATE", open: true })
  })

  it("does not push PANEL_STATE when no panel state has ever been recorded", async () => {
    const { mock } = await loadServiceWorker()
    const listener = getListener<
      (tabId: number, info: { status?: string }, tab: chrome.tabs.Tab) => Promise<void>
    >(mock.tabs.onUpdated.addListener)

    await listener(9, { status: "complete" }, { url: "https://example.com" } as chrome.tabs.Tab)

    expect(mock.tabs.sendMessage).not.toHaveBeenCalled()
  })

  it("restores the large font zoom level on the new page", async () => {
    const { mock, storage } = await loadServiceWorker()
    await storage.session.set("currentFontSize", "large")
    const listener = getListener<
      (tabId: number, info: { status?: string }, tab: chrome.tabs.Tab) => Promise<void>
    >(mock.tabs.onUpdated.addListener)

    await listener(3, { status: "complete" }, { url: "https://example.com" } as chrome.tabs.Tab)

    expect(mock.tabs.setZoom).toHaveBeenCalledWith(3, 1.25)
  })

  it("restores the x-large font zoom level on the new page", async () => {
    const { mock, storage } = await loadServiceWorker()
    await storage.session.set("currentFontSize", "xlarge")
    const listener = getListener<
      (tabId: number, info: { status?: string }, tab: chrome.tabs.Tab) => Promise<void>
    >(mock.tabs.onUpdated.addListener)

    await listener(3, { status: "complete" }, { url: "https://example.com" } as chrome.tabs.Tab)

    expect(mock.tabs.setZoom).toHaveBeenCalledWith(3, 1.5)
  })

  it("does not call setZoom for the normal (1x) font size", async () => {
    const { mock } = await loadServiceWorker()
    const listener = getListener<
      (tabId: number, info: { status?: string }, tab: chrome.tabs.Tab) => Promise<void>
    >(mock.tabs.onUpdated.addListener)

    await listener(3, { status: "complete" }, { url: "https://example.com" } as chrome.tabs.Tab)

    expect(mock.tabs.setZoom).not.toHaveBeenCalled()
  })
})

describe("storage.onChanged — ad-block sync", () => {
  it("re-syncs ad blocking when config.security.blockAds changes in the local area", async () => {
    const { mock } = await loadServiceWorker()
    const listener = getListener<
      (changes: Record<string, { newValue?: unknown }>, area: string) => Promise<void>
    >(mock.storage.onChanged.addListener)

    await listener(
      { config: { newValue: { security: { blockAds: false } } } },
      "local",
    )

    expect(mock.declarativeNetRequest.updateEnabledRulesets).toHaveBeenCalledWith(
      expect.objectContaining({ disableRulesetIds: ["ad_block_rules"] }),
    )
  })

  it("ignores changes outside the local area", async () => {
    const { mock } = await loadServiceWorker()
    const listener = getListener<
      (changes: Record<string, { newValue?: unknown }>, area: string) => Promise<void>
    >(mock.storage.onChanged.addListener)

    await listener({ config: { newValue: { security: { blockAds: false } } } }, "session")

    expect(mock.declarativeNetRequest.updateEnabledRulesets).not.toHaveBeenCalled()
  })

  it("ignores local-area changes unrelated to config", async () => {
    const { mock } = await loadServiceWorker()
    const listener = getListener<
      (changes: Record<string, { newValue?: unknown }>, area: string) => Promise<void>
    >(mock.storage.onChanged.addListener)

    await listener({ shortcuts: { newValue: [] } }, "local")

    expect(mock.declarativeNetRequest.updateEnabledRulesets).not.toHaveBeenCalled()
  })

  it("ignores a config change that doesn't touch security.blockAds", async () => {
    const { mock } = await loadServiceWorker()
    const listener = getListener<
      (changes: Record<string, { newValue?: unknown }>, area: string) => Promise<void>
    >(mock.storage.onChanged.addListener)

    await listener({ config: { newValue: { seniorName: "Dad" } } }, "local")

    expect(mock.declarativeNetRequest.updateEnabledRulesets).not.toHaveBeenCalled()
  })
})

describe("sidePanel onOpened/onClosed broadcast", () => {
  it("on open: marks the session panelOpen and notifies every http(s) tab", async () => {
    const { mock } = await loadServiceWorker()
    mock.tabs.query.mockResolvedValueOnce([
      { id: 10 } as chrome.tabs.Tab,
      { id: 11 } as chrome.tabs.Tab,
    ])
    const onOpened = getListener<() => void>(mock.sidePanel.onOpened.addListener)

    onOpened()
    await vi.waitFor(() => expect(mock.tabs.sendMessage).toHaveBeenCalled())

    expect(mock.storage.session._data.get("panelOpen")).toBe(true)
    expect(mock.tabs.sendMessage).toHaveBeenCalledWith(10, { type: "PANEL_STATE", open: true })
    expect(mock.tabs.sendMessage).toHaveBeenCalledWith(11, { type: "PANEL_STATE", open: true })
  })

  it("on close: marks the session panelOpen=false and clears panelTourActive", async () => {
    const { mock } = await loadServiceWorker()
    mock.tabs.query.mockResolvedValueOnce([])
    const onClosed = getListener<() => void>(mock.sidePanel.onClosed.addListener)

    onClosed()
    await vi.waitFor(() => expect(mock.storage.session.set).toHaveBeenCalled())

    expect(mock.storage.session.set).toHaveBeenCalledWith(
      expect.objectContaining({ panelOpen: false, panelTourActive: false }),
    )
  })

  it("skips tabs with no id when broadcasting panel state", async () => {
    const { mock } = await loadServiceWorker()
    mock.tabs.query.mockResolvedValueOnce([
      { id: undefined } as unknown as chrome.tabs.Tab,
      { id: 20 } as chrome.tabs.Tab,
    ])
    const onOpened = getListener<() => void>(mock.sidePanel.onOpened.addListener)

    onOpened()
    await vi.waitFor(() => expect(mock.tabs.sendMessage).toHaveBeenCalled())

    expect(mock.tabs.sendMessage).toHaveBeenCalledTimes(1)
    expect(mock.tabs.sendMessage).toHaveBeenCalledWith(20, { type: "PANEL_STATE", open: true })
  })
})
