// B-05 license/trial gate. ensureTrialStatus() runs on every service-worker
// wake-up and decides, from a cached subscription + an optional server
// round-trip, whether the extension should lock the senior out
// (status: "expired"). Getting this wrong either locks out a paying
// customer or lets an expired trial run forever — both branches matter.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { storage } from "@shared/storage"
import { ensureTrialStatus } from "../licenseManager"
import type { Subscription } from "@shared/types"

const DAY_MS = 24 * 60 * 60 * 1000

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString()
}

function daysFromNow(d: number): string {
  return new Date(Date.now() + d * DAY_MS).toISOString()
}

function baseSub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    status: "trial",
    licenseKey: "lic-123",
    email: "caregiver@example.com",
    trialEndsAt: null,
    lastValidatedAt: null,
    daysLeft: null,
    ...overrides,
  }
}

beforeEach(async () => {
  await storage.local.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("ensureTrialStatus — no license key", () => {
  it("does nothing when there is no subscription at all", async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)
    await ensureTrialStatus()
    expect(fetchSpy).not.toHaveBeenCalled()
    await expect(storage.local.get("subscription")).resolves.toBeNull()
  })

  it("does nothing when licenseKey is an empty string", async () => {
    await storage.local.set("subscription", baseSub({ licenseKey: "" }))
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)
    await ensureTrialStatus()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe("ensureTrialStatus — cache window", () => {
  it("skips the network call when last validated under 24h ago", async () => {
    await storage.local.set("subscription", baseSub({ lastValidatedAt: hoursAgo(1) }))
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)
    await ensureTrialStatus()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("calls the server when last validated over 24h ago", async () => {
    await storage.local.set("subscription", baseSub({ lastValidatedAt: hoursAgo(25) }))
    const fetchSpy = vi.fn(
      async () => new Response(JSON.stringify({ status: "active" }), { status: 200 }),
    )
    vi.stubGlobal("fetch", fetchSpy)
    await ensureTrialStatus()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})

describe("ensureTrialStatus — successful server validation", () => {
  it("updates status, daysLeft, and lastValidatedAt from the server response", async () => {
    await storage.local.set("subscription", baseSub({ lastValidatedAt: hoursAgo(25), status: "trial" }))
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ status: "active", daysLeft: null }), { status: 200 })),
    )
    await ensureTrialStatus()
    const sub = await storage.local.get("subscription")
    expect(sub!.status).toBe("active")
    expect(sub!.lastValidatedAt).not.toBeNull()
  })

  it("preserves the existing trialEndsAt when the response omits the field", async () => {
    await storage.local.set(
      "subscription",
      baseSub({ lastValidatedAt: hoursAgo(25), trialEndsAt: "2026-01-01T00:00:00.000Z" }),
    )
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ status: "trial" }), { status: 200 })),
    )
    await ensureTrialStatus()
    const sub = await storage.local.get("subscription")
    expect(sub!.trialEndsAt).toBe("2026-01-01T00:00:00.000Z")
  })

  it("overwrites trialEndsAt with an explicit null from the server", async () => {
    await storage.local.set(
      "subscription",
      baseSub({ lastValidatedAt: hoursAgo(25), trialEndsAt: "2026-01-01T00:00:00.000Z" }),
    )
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ status: "active", trialEndsAt: null }), { status: 200 }),
      ),
    )
    await ensureTrialStatus()
    const sub = await storage.local.get("subscription")
    expect(sub!.trialEndsAt).toBeNull()
  })

  it("updates the email when the server returns one", async () => {
    await storage.local.set("subscription", baseSub({ lastValidatedAt: hoursAgo(25), email: "old@example.com" }))
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ status: "active", email: "new@example.com" }), { status: 200 }),
      ),
    )
    await ensureTrialStatus()
    const sub = await storage.local.get("subscription")
    expect(sub!.email).toBe("new@example.com")
  })
})

describe("ensureTrialStatus — server unreachable, previously validated", () => {
  it("does not expire when within the 3-day offline grace period", async () => {
    await storage.local.set(
      "subscription",
      baseSub({ status: "active", lastValidatedAt: hoursAgo(25) }), // >24h (past cache) but <3d
    )
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down") }))
    await ensureTrialStatus()
    const sub = await storage.local.get("subscription")
    expect(sub!.status).toBe("active")
  })

  it("expires once the 3-day offline grace period elapses", async () => {
    await storage.local.set(
      "subscription",
      baseSub({ status: "active", lastValidatedAt: new Date(Date.now() - 4 * DAY_MS).toISOString() }),
    )
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down") }))
    await ensureTrialStatus()
    const sub = await storage.local.get("subscription")
    expect(sub!.status).toBe("expired")
  })

  it("also applies offline-grace expiry when the server responds non-OK (not just network errors)", async () => {
    await storage.local.set(
      "subscription",
      baseSub({ status: "active", lastValidatedAt: new Date(Date.now() - 4 * DAY_MS).toISOString() }),
    )
    vi.stubGlobal("fetch", vi.fn(async () => new Response("error", { status: 500 })))
    await ensureTrialStatus()
    const sub = await storage.local.get("subscription")
    expect(sub!.status).toBe("expired")
  })
})

describe("ensureTrialStatus — server unreachable, never validated", () => {
  it("does not expire while still inside trialEndsAt + grace period", async () => {
    await storage.local.set(
      "subscription",
      baseSub({ status: "trial", lastValidatedAt: null, trialEndsAt: daysFromNow(1) }),
    )
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down") }))
    await ensureTrialStatus()
    const sub = await storage.local.get("subscription")
    expect(sub!.status).toBe("trial")
  })

  it("expires once trialEndsAt + GRACE_DAYS has fully elapsed offline", async () => {
    await storage.local.set(
      "subscription",
      // Trial ended 5 days ago; GRACE_DAYS (3) has elapsed too.
      baseSub({ status: "trial", lastValidatedAt: null, trialEndsAt: new Date(Date.now() - 5 * DAY_MS).toISOString() }),
    )
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down") }))
    await ensureTrialStatus()
    const sub = await storage.local.get("subscription")
    expect(sub!.status).toBe("expired")
  })

  it("does not touch status when there is no trialEndsAt to evaluate", async () => {
    await storage.local.set(
      "subscription",
      baseSub({ status: "trial", lastValidatedAt: null, trialEndsAt: null }),
    )
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down") }))
    await ensureTrialStatus()
    const sub = await storage.local.get("subscription")
    expect(sub!.status).toBe("trial")
  })
})

describe("ensureTrialStatus — resilience", () => {
  it("does not throw when the storage layer itself fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.spyOn(storage.local, "get").mockRejectedValueOnce(new Error("storage boom"))
    await expect(ensureTrialStatus()).resolves.toBeUndefined()
    expect(warnSpy).toHaveBeenCalled()
  })
})
