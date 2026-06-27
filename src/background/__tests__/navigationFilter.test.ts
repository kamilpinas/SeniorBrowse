// Covers the chrome.webNavigation.onBeforeNavigate listener in
// service-worker.ts — the B-06 hard blacklist gate plus the bundled +
// periodically-refreshed malware domain list, both of which decide whether
// a navigation proceeds or gets redirected to blocked.html.

import { describe, it, expect, vi } from "vitest"
import { installChromeMock } from "../../__tests__/helpers/chromeMock"

vi.mock("../malwareBlocklist", () => ({
  refreshRemoteList: vi.fn(async () => {}),
  getMalwareDomainSet: vi.fn(async () => new Set<string>()),
}))

async function loadNavigationListener() {
  vi.resetModules()
  const mock = installChromeMock()
  await import("../service-worker")
  const { storage } = await import("@shared/storage")
  const { getMalwareDomainSet } = await import("../malwareBlocklist")
  // vi.mock's factory result is memoized independently of vi.resetModules(),
  // so call history on this mock otherwise accumulates across every test in
  // this file — clear it so each test starts from a clean slate.
  vi.mocked(getMalwareDomainSet).mockClear()

  const listener = mock.webNavigation.onBeforeNavigate.addListener.mock
    .calls[0]?.[0] as (details: {
    frameId: number
    url: string
    tabId: number
  }) => Promise<void> | void

  return { mock, storage, getMalwareDomainSet: vi.mocked(getMalwareDomainSet), listener }
}

function navDetails(url: string, overrides: Partial<{ frameId: number; tabId: number }> = {}) {
  return { frameId: 0, tabId: 1, url, ...overrides }
}

describe("onBeforeNavigate — basic guards", () => {
  it("ignores navigations in non-main frames (iframes)", async () => {
    const { mock, listener } = await loadNavigationListener()
    await listener(navDetails("https://blocked.example", { frameId: 1 }))
    expect(mock.tabs.update).not.toHaveBeenCalled()
  })

  it("ignores non-http(s) URLs (chrome://, file://, etc.)", async () => {
    const { mock, listener } = await loadNavigationListener()
    await listener(navDetails("chrome://settings"))
    expect(mock.tabs.update).not.toHaveBeenCalled()
  })

  it("ignores a malformed URL instead of throwing", async () => {
    const { mock, listener } = await loadNavigationListener()
    await expect(listener(navDetails("http://"))).resolves.toBeUndefined()
    expect(mock.tabs.update).not.toHaveBeenCalled()
  })
})

describe("onBeforeNavigate — blacklist (B-06)", () => {
  it("hard-blocks an exact blacklisted hostname", async () => {
    const { mock, storage, listener } = await loadNavigationListener()
    await storage.local.update("config", { security: { blacklist: ["evil.com"] } })

    await listener(navDetails("https://evil.com/path"))

    expect(mock.tabs.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        url: expect.stringContaining("blocked.html?url=") as unknown as string,
      }),
    )
  })

  it("hard-blocks a subdomain of a blacklisted hostname", async () => {
    const { mock, storage, listener } = await loadNavigationListener()
    await storage.local.update("config", { security: { blacklist: ["evil.com"] } })
    await listener(navDetails("https://sub.evil.com/path"))
    expect(mock.tabs.update).toHaveBeenCalledTimes(1)
  })

  it("does not block a hostname that merely contains the blacklisted string", async () => {
    const { mock, storage, listener } = await loadNavigationListener()
    await storage.local.update("config", { security: { blacklist: ["evil.com"] } })
    // "notevil.com" must not match "evil.com" via naive substring matching.
    await listener(navDetails("https://notevil.com/path"))
    expect(mock.tabs.update).not.toHaveBeenCalled()
  })

  it("does not block a hostname that isn't on the blacklist", async () => {
    const { mock, storage, listener } = await loadNavigationListener()
    await storage.local.update("config", { security: { blacklist: [] } })
    await listener(navDetails("https://example.com/path"))
    expect(mock.tabs.update).not.toHaveBeenCalled()
  })
})

describe("onBeforeNavigate — malware domain list", () => {
  it("blocks a hostname found in the malware domain set when the toggle is on", async () => {
    const { mock, storage, getMalwareDomainSet, listener } = await loadNavigationListener()
    getMalwareDomainSet.mockResolvedValue(new Set(["malware.example"]))
    await storage.local.update("config", { security: { blockKnownMalware: true } })

    await listener(navDetails("https://malware.example/path"))

    expect(mock.tabs.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        url: expect.stringContaining("blocked.html?url=") as unknown as string,
      }),
    )
  })

  it("blocks a subdomain of a domain on the malware list", async () => {
    const { mock, storage, getMalwareDomainSet, listener } = await loadNavigationListener()
    getMalwareDomainSet.mockResolvedValue(new Set(["malware.example"]))
    await storage.local.update("config", { security: { blockKnownMalware: true } })

    await listener(navDetails("https://sub.malware.example/path"))

    expect(mock.tabs.update).toHaveBeenCalledTimes(1)
  })

  it("does not block when blockKnownMalware is off, even on a known-bad hostname", async () => {
    const { mock, storage, getMalwareDomainSet, listener } = await loadNavigationListener()
    getMalwareDomainSet.mockResolvedValue(new Set(["malware.example"]))
    await storage.local.update("config", { security: { blockKnownMalware: false } })

    await listener(navDetails("https://malware.example/path"))

    expect(mock.tabs.update).not.toHaveBeenCalled()
    // Toggled off should short-circuit before even consulting the list.
    expect(getMalwareDomainSet).not.toHaveBeenCalled()
  })

  it("does not block a hostname absent from the malware list", async () => {
    const { mock, storage, getMalwareDomainSet, listener } = await loadNavigationListener()
    getMalwareDomainSet.mockResolvedValue(new Set(["malware.example"]))
    await storage.local.update("config", { security: { blockKnownMalware: true } })

    await listener(navDetails("https://example.com/path"))

    expect(mock.tabs.update).not.toHaveBeenCalled()
  })

  it("blocks via the malware list even when the blacklist is empty", async () => {
    const { mock, storage, getMalwareDomainSet, listener } = await loadNavigationListener()
    getMalwareDomainSet.mockResolvedValue(new Set(["malware.example"]))
    await storage.local.update("config", {
      security: { blacklist: [], blockKnownMalware: true },
    })

    await listener(navDetails("https://malware.example/path"))

    expect(mock.tabs.update).toHaveBeenCalledTimes(1)
  })
})
