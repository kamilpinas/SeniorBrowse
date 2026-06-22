// checkUrl() proxies to a Supabase edge function for Google Safe Browsing
// results. It must fail open (return "safe") on any misconfiguration,
// non-OK response, or network error — a Supabase outage must never block
// browsing — and it caches per-URL for the lifetime of the service worker.
//
// PROXY_URL and the cache are both module-level state computed at import
// time, so every test re-imports the module fresh after stubbing the env.

import { describe, it, expect, afterEach, vi } from "vitest"

async function loadCheckUrl(supabaseUrl: string) {
  vi.resetModules()
  vi.stubEnv("VITE_SUPABASE_URL", supabaseUrl)
  const mod = await import("../safetyCheck")
  return mod.checkUrl
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("checkUrl — unconfigured proxy", () => {
  it("returns 'safe' without calling fetch when VITE_SUPABASE_URL is empty", async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)
    const checkUrl = await loadCheckUrl("")

    await expect(checkUrl("https://example.com")).resolves.toBe("safe")
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe("checkUrl — configured proxy", () => {
  it("returns 'warn' when the proxy reports warn", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ result: "warn" }), { status: 200 })),
    )
    const checkUrl = await loadCheckUrl("https://fake.supabase.co")
    await expect(checkUrl("https://phish.example")).resolves.toBe("warn")
  })

  it("returns 'block' when the proxy reports block", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ result: "block" }), { status: 200 })),
    )
    const checkUrl = await loadCheckUrl("https://fake.supabase.co")
    await expect(checkUrl("https://malware.example")).resolves.toBe("block")
  })

  it("treats an unrecognized result value as safe", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ result: "something-else" }), { status: 200 })),
    )
    const checkUrl = await loadCheckUrl("https://fake.supabase.co")
    await expect(checkUrl("https://example.com")).resolves.toBe("safe")
  })

  it("treats a missing result field as safe", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })),
    )
    const checkUrl = await loadCheckUrl("https://fake.supabase.co")
    await expect(checkUrl("https://example.com")).resolves.toBe("safe")
  })

  it("fails open (returns 'safe') when the proxy responds non-OK", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("error", { status: 500 })),
    )
    const checkUrl = await loadCheckUrl("https://fake.supabase.co")
    await expect(checkUrl("https://example.com")).resolves.toBe("safe")
    expect(warnSpy).toHaveBeenCalled()
  })

  it("fails open (returns 'safe') when fetch rejects (network error)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down")
      }),
    )
    const checkUrl = await loadCheckUrl("https://fake.supabase.co")
    await expect(checkUrl("https://example.com")).resolves.toBe("safe")
    expect(warnSpy).toHaveBeenCalled()
  })

  it("caches the result so a repeated URL does not call fetch again", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ result: "block" }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)
    const checkUrl = await loadCheckUrl("https://fake.supabase.co")

    await expect(checkUrl("https://repeat.example")).resolves.toBe("block")
    await expect(checkUrl("https://repeat.example")).resolves.toBe("block")
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("checks each distinct URL independently", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { url: string }
      const result = body.url.includes("bad") ? "block" : "safe"
      return new Response(JSON.stringify({ result }), { status: 200 })
    })
    vi.stubGlobal("fetch", fetchMock)
    const checkUrl = await loadCheckUrl("https://fake.supabase.co")

    await expect(checkUrl("https://good.example")).resolves.toBe("safe")
    await expect(checkUrl("https://bad.example")).resolves.toBe("block")
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
