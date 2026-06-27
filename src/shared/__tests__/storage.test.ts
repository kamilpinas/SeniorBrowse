// storage.ts's get() deep-merges stored values over DEFAULT_CONFIG so that
// adding a new Config field never breaks existing installs (the new field
// just falls back to its default). That merge behavior — plus update(),
// remove(), and clear() — has no dedicated coverage elsewhere, even though
// every other module in the extension depends on it being correct.

import { describe, it, expect, beforeEach } from "vitest"
import { storage } from "../storage"

beforeEach(async () => {
  await storage.local.clear()
  await storage.session.clear()
})

describe("storage.local.get", () => {
  it("returns the default config when nothing has been stored", async () => {
    const config = await storage.local.get("config")
    expect(config.pinHash).toBe("")
    expect(config.security.blockDownloads).toBe(true)
  })

  it("returns a fresh clone, not a shared reference to the defaults", async () => {
    const a = await storage.local.get("config")
    a.seniorName = "mutated"
    const b = await storage.local.get("config")
    expect(b.seniorName).toBe("")
  })

  it("deep-merges a partially-stored config over the defaults", async () => {
    // Simulate an old install that only ever wrote `seniorName`, predating
    // some newer Config field — get() must still fill in every default.
    await storage.local.set("config", {
      ...(await storage.local.get("config")),
      seniorName: "Grandpa",
    })
    const config = await storage.local.get("config")
    expect(config.seniorName).toBe("Grandpa")
    expect(config.security.blockDownloads).toBe(true)
  })

  it("returns the stored array as-is for array-valued keys (shortcuts)", async () => {
    await storage.local.set("shortcuts", [
      { id: "1", label: "BBC", url: "https://bbc.com", position: 0, size: "medium" },
    ])
    const shortcuts = await storage.local.get("shortcuts")
    expect(shortcuts).toHaveLength(1)
    expect(shortcuts[0]!.label).toBe("BBC")
  })

  it("returns the default empty array when shortcuts were never set", async () => {
    const shortcuts = await storage.local.get("shortcuts")
    expect(shortcuts).toEqual([])
  })
})

describe("storage.local.update", () => {
  it("merges a partial update into the existing config without clobbering siblings", async () => {
    await storage.local.update("config", { seniorName: "Dad" })
    await storage.local.update("config", { caregiverName: "Mom" })
    const config = await storage.local.get("config")
    expect(config.seniorName).toBe("Dad")
    expect(config.caregiverName).toBe("Mom")
  })

  it("merges nested objects (security) without dropping unrelated nested fields", async () => {
    await storage.local.update("config", { security: { blockDownloads: false } })
    const config = await storage.local.get("config")
    expect(config.security.blockDownloads).toBe(false)
    // blockSuspiciousLinks must survive even though it wasn't part of this update.
    expect(config.security.blockSuspiciousLinks).toBe("warn")
  })

  it("returns the merged value", async () => {
    const result = await storage.local.update("config", { seniorName: "Dad" })
    expect(result.seniorName).toBe("Dad")
  })

  it("replaces non-object values outright (arrays are not merged)", async () => {
    await storage.local.set("shortcuts", [
      { id: "1", label: "A", url: "https://a.com", position: 0, size: "medium" },
    ])
    await storage.local.update("shortcuts", [
      { id: "2", label: "B", url: "https://b.com", position: 0, size: "medium" },
    ])
    const shortcuts = await storage.local.get("shortcuts")
    expect(shortcuts).toHaveLength(1)
    expect(shortcuts[0]!.id).toBe("2")
  })
})

describe("storage.local.remove / clear", () => {
  it("remove() resets a key back to its default on next get", async () => {
    await storage.local.set("shortcuts", [
      { id: "1", label: "A", url: "https://a.com", position: 0, size: "medium" },
    ])
    await storage.local.remove("shortcuts")
    expect(await storage.local.get("shortcuts")).toEqual([])
  })

  it("clear() resets every key back to defaults", async () => {
    await storage.local.set("shortcuts", [
      { id: "1", label: "A", url: "https://a.com", position: 0, size: "medium" },
    ])
    await storage.local.update("config", { seniorName: "Dad" })
    await storage.local.clear()
    expect(await storage.local.get("shortcuts")).toEqual([])
    expect((await storage.local.get("config")).seniorName).toBe("")
  })
})

describe("storage.session", () => {
  it("defaults adminModeActive to false", async () => {
    expect(await storage.session.get("adminModeActive")).toBe(false)
  })

  it("defaults bypassedUrls to an empty array", async () => {
    expect(await storage.session.get("bypassedUrls")).toEqual([])
  })

  it("is isolated from storage.local (separate areas)", async () => {
    await storage.session.set("adminModeActive", true)
    const config = await storage.local.get("config")
    expect(config).toBeDefined()
    expect(await storage.session.get("adminModeActive")).toBe(true)
  })
})
