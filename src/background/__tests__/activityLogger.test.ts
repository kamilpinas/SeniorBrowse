import { describe, it, expect, beforeEach, vi } from "vitest"
import { storage } from "@shared/storage"
import { logActivity } from "../activityLogger"
import { MAX_LOG_ENTRIES, MAX_LOG_AGE_DAYS } from "@shared/constants"
import type { ActivityLogEntry } from "@shared/types"

// activityLogger.ts reads/writes via @shared/storage, which falls back to an
// in-memory Map when no chrome.storage is present (as in this test env) —
// clearing it between tests keeps each test's log empty to start.
beforeEach(async () => {
  await storage.local.clear()
})

describe("logActivity", () => {
  it("appends a well-formed entry", async () => {
    await logActivity("https://example.com", "Example Site", "visit")
    const log = await storage.local.get("activityLog")
    expect(log).toHaveLength(1)
    expect(log[0]).toMatchObject({
      url: "https://example.com",
      title: "Example Site",
      type: "visit",
    })
    expect(log[0]!.visitedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it("falls back to the URL as title when title is empty", async () => {
    await logActivity("https://example.com", "", "visit")
    const log = await storage.local.get("activityLog")
    expect(log[0]!.title).toBe("https://example.com")
  })

  it("records save and search entry types", async () => {
    await logActivity("https://example.com/article", "Article", "save")
    await logActivity("https://example.com/search?q=cats", "cats", "search")
    const log = await storage.local.get("activityLog")
    expect(log.map((e) => e.type)).toEqual(["save", "search"])
  })

  it("appends newest entries at the end of the log", async () => {
    await logActivity("https://a.com", "A", "visit")
    await logActivity("https://b.com", "B", "visit")
    const log = await storage.local.get("activityLog")
    expect(log.map((e) => e.url)).toEqual(["https://a.com", "https://b.com"])
  })

  it("caps the log at MAX_LOG_ENTRIES, dropping the oldest first", async () => {
    const now = new Date().toISOString()
    const seeded: ActivityLogEntry[] = Array.from({ length: MAX_LOG_ENTRIES }, (_, i) => ({
      url: `https://site-${i}.com`,
      title: `Site ${i}`,
      visitedAt: now,
      type: "visit" as const,
    }))
    await storage.local.set("activityLog", seeded)

    await logActivity("https://newest.com", "Newest", "visit")

    const log = await storage.local.get("activityLog")
    expect(log).toHaveLength(MAX_LOG_ENTRIES)
    expect(log[log.length - 1]!.url).toBe("https://newest.com")
    expect(log.some((e) => e.url === "https://site-0.com")).toBe(false)
  })

  it("prunes entries older than MAX_LOG_AGE_DAYS on every write", async () => {
    const tooOld = new Date(
      Date.now() - (MAX_LOG_AGE_DAYS + 1) * 24 * 60 * 60 * 1000,
    ).toISOString()
    const stillFresh = new Date(
      Date.now() - (MAX_LOG_AGE_DAYS - 1) * 24 * 60 * 60 * 1000,
    ).toISOString()

    await storage.local.set("activityLog", [
      { url: "https://old.com", title: "Old", visitedAt: tooOld, type: "visit" },
      { url: "https://fresh.com", title: "Fresh", visitedAt: stillFresh, type: "visit" },
    ])

    await logActivity("https://new.com", "New", "visit")

    const log = await storage.local.get("activityLog")
    const urls = log.map((e) => e.url)
    expect(urls).not.toContain("https://old.com")
    expect(urls).toContain("https://fresh.com")
    expect(urls).toContain("https://new.com")
  })

  it("does not throw when the storage layer fails", async () => {
    const getSpy = vi.spyOn(storage.local, "get").mockRejectedValueOnce(new Error("boom"))
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    await expect(logActivity("https://example.com", "x", "visit")).resolves.toBeUndefined()

    expect(warnSpy).toHaveBeenCalled()
    getSpy.mockRestore()
    warnSpy.mockRestore()
  })
})
