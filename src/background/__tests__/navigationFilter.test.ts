// Covers the chrome.webNavigation.onBeforeNavigate listener in
// service-worker.ts — the B-02/B-06 Safe Browsing + blacklist/whitelist
// gate that decides whether a navigation proceeds, gets hard-blocked, or
// gets a "continue anyway" warning.
//
// checkUrl (Safe Browsing proxy) is mocked so these tests never hit the
// network and can deterministically drive every threat-level branch.

import { describe, it, expect, vi } from "vitest"
import { installChromeMock } from "../../__tests__/helpers/chromeMock"

vi.mock("../safetyCheck", () => ({
  checkUrl: vi.fn(async () => "safe" as const),
}))

async function loadNavigationListener() {
  vi.resetModules()
  const mock = installChromeMock()
  await import("../service-worker")
  const { storage } = await import("@shared/storage")
  const { checkUrl } = await import("../safetyCheck")

  const listener = mock.webNavigation.onBeforeNavigate.addListener.mock
    .calls[0]?.[0] as (details: {
    frameId: number
    url: string
    tabId: number
  }) => Promise<void> | void

  return { mock, storage, checkUrl: vi.mocked(checkUrl), listener }
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

  it("lets a session-bypassed URL through without redirecting", async () => {
    const { mock, storage, checkUrl, listener } = await loadNavigationListener()
    checkUrl.mockResolvedValue("block")
    await storage.session.set("bypassedUrls", ["https://bypassed.example/"])
    await listener(navDetails("https://bypassed.example/"))
    expect(mock.tabs.update).not.toHaveBeenCalled()
  })
})

describe("onBeforeNavigate — blacklist (B-06)", () => {
  it("hard-blocks an exact blacklisted hostname regardless of suspicious-link mode", async () => {
    const { mock, storage, listener } = await loadNavigationListener()
    await storage.local.update("config", { security: { blacklist: ["evil.com"], blockSuspiciousLinks: "off" } })

    await listener(navDetails("https://evil.com/path"))

    expect(mock.tabs.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        url: expect.stringContaining("blocked.html?url=") as unknown as string,
      }),
    )
    const calledUrl = mock.tabs.update.mock.calls[0]![1].url as string
    expect(calledUrl).toContain("reason=blacklist")
  })

  it("hard-blocks a subdomain of a blacklisted hostname", async () => {
    const { mock, storage, listener } = await loadNavigationListener()
    await storage.local.update("config", { security: { blacklist: ["evil.com"] } })
    await listener(navDetails("https://sub.evil.com/path"))
    expect(mock.tabs.update).toHaveBeenCalledTimes(1)
  })

  it("does not block a hostname that merely contains the blacklisted string", async () => {
    const { mock, storage, listener } = await loadNavigationListener()
    await storage.local.update("config", {
      security: { blacklist: ["evil.com"], blockSuspiciousLinks: "off" },
    })
    // "notevil.com" must not match "evil.com" via naive substring matching.
    await listener(navDetails("https://notevil.com/path"))
    expect(mock.tabs.update).not.toHaveBeenCalled()
  })

  it("does not call the Safe Browsing proxy for a blacklisted URL (short-circuits)", async () => {
    const { storage, checkUrl, listener } = await loadNavigationListener()
    await storage.local.update("config", { security: { blacklist: ["evil.com"] } })
    await listener(navDetails("https://evil.com/path"))
    expect(checkUrl).not.toHaveBeenCalled()
  })
})

describe("onBeforeNavigate — whitelist (B-06)", () => {
  it("bypasses Safe Browsing entirely for a whitelisted hostname", async () => {
    const { mock, storage, checkUrl, listener } = await loadNavigationListener()
    checkUrl.mockResolvedValue("block")
    await storage.local.update("config", {
      security: { whitelist: ["trusted.example"], blockSuspiciousLinks: "block" },
    })

    await listener(navDetails("https://trusted.example/path"))

    expect(checkUrl).not.toHaveBeenCalled()
    expect(mock.tabs.update).not.toHaveBeenCalled()
  })

  it("blacklist wins over whitelist when a hostname is on both lists (deny takes priority)", async () => {
    const { mock, storage, listener } = await loadNavigationListener()
    await storage.local.update("config", {
      security: { whitelist: ["both.example"], blacklist: ["both.example"] },
    })
    await listener(navDetails("https://both.example/path"))
    const calledUrl = mock.tabs.update.mock.calls[0]![1].url as string
    expect(calledUrl).toContain("reason=blacklist")
  })
})

describe("onBeforeNavigate — Safe Browsing modes (B-02)", () => {
  it("does not call checkUrl when blockSuspiciousLinks is 'off'", async () => {
    const { checkUrl, storage, listener } = await loadNavigationListener()
    await storage.local.update("config", { security: { blockSuspiciousLinks: "off" } })
    await listener(navDetails("https://example.com"))
    expect(checkUrl).not.toHaveBeenCalled()
  })

  it("does not redirect when checkUrl reports 'safe'", async () => {
    const { mock, checkUrl, storage, listener } = await loadNavigationListener()
    checkUrl.mockResolvedValue("safe")
    await storage.local.update("config", { security: { blockSuspiciousLinks: "block" } })
    await listener(navDetails("https://example.com"))
    expect(mock.tabs.update).not.toHaveBeenCalled()
  })

  it("'warn' mode always redirects to warn.html, even for a 'block'-level threat", async () => {
    const { mock, checkUrl, storage, listener } = await loadNavigationListener()
    checkUrl.mockResolvedValue("block")
    await storage.local.update("config", { security: { blockSuspiciousLinks: "warn" } })
    await listener(navDetails("https://malware.example"))
    const calledUrl = mock.tabs.update.mock.calls[0]![1].url as string
    expect(calledUrl).toContain("warn.html?url=")
    expect(calledUrl).toContain("reason=safebrowsing")
  })

  it("'warn' mode redirects to warn.html for a 'warn'-level threat", async () => {
    const { mock, checkUrl, storage, listener } = await loadNavigationListener()
    checkUrl.mockResolvedValue("warn")
    await storage.local.update("config", { security: { blockSuspiciousLinks: "warn" } })
    await listener(navDetails("https://phish.example"))
    const calledUrl = mock.tabs.update.mock.calls[0]![1].url as string
    expect(calledUrl).toContain("warn.html?url=")
  })

  it("'block' mode soft-warns (warn.html) for a 'warn'-level threat", async () => {
    const { mock, checkUrl, storage, listener } = await loadNavigationListener()
    checkUrl.mockResolvedValue("warn")
    await storage.local.update("config", { security: { blockSuspiciousLinks: "block" } })
    await listener(navDetails("https://phish.example"))
    const calledUrl = mock.tabs.update.mock.calls[0]![1].url as string
    expect(calledUrl).toContain("warn.html?url=")
  })

  it("'block' mode hard-blocks (blocked.html) for a 'block'-level threat", async () => {
    const { mock, checkUrl, storage, listener } = await loadNavigationListener()
    checkUrl.mockResolvedValue("block")
    await storage.local.update("config", { security: { blockSuspiciousLinks: "block" } })
    await listener(navDetails("https://malware.example"))
    const calledUrl = mock.tabs.update.mock.calls[0]![1].url as string
    expect(calledUrl).toContain("blocked.html?url=")
    expect(calledUrl).toContain("reason=safebrowsing")
  })
})
