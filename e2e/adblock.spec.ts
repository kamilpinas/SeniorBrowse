import { test, expect, waitForExtensionReady } from "./fixtures"

// B-07: declarativeNetRequest ad blocking. The ruleset is declared in
// manifest.json with enabled:false and flipped on by the background's own
// onInstalled handler (default config.security.blockAds is true) — this is
// real network-layer blocking, not something jsdom/vitest can exercise.

test("ad blocking is enabled by default and blocks a known ad-network request", async ({
  context,
  serviceWorker,
}) => {
  await waitForExtensionReady(serviceWorker)

  const page = await context.newPage()
  await page.goto("https://example.com/")

  // declarativeNetRequest-blocked requests fail with the specific
  // net::ERR_BLOCKED_BY_CLIENT code — that's the only error code that proves
  // *our* rule did the blocking, as opposed to any other network failure.
  let blockedErrorSeen = false
  page.on("requestfailed", (req) => {
    if (req.url().includes("googlesyndication.com") && req.failure()?.errorText === "net::ERR_BLOCKED_BY_CLIENT") {
      blockedErrorSeen = true
    }
  })

  await page.evaluate(() =>
    fetch("https://googlesyndication.com/pagead/e2e-probe", { mode: "no-cors" }).catch(() => {}),
  )
  await expect.poll(() => blockedErrorSeen).toBe(true)
})

test("disabling ad blocking in settings lets ad-network requests through", async ({
  context,
  serviceWorker,
}) => {
  await waitForExtensionReady(serviceWorker)
  await serviceWorker.evaluate(() =>
    chrome.storage.local.set({ config: { security: { blockAds: false } } }),
  )

  // service-worker.ts's storage.onChanged listener calls updateAdBlocking()
  // asynchronously in response to that write — wait for the ruleset itself
  // to actually flip off rather than guessing at a fixed delay.
  await expect
    .poll(() =>
      serviceWorker.evaluate(async () => {
        const sets = await chrome.declarativeNetRequest.getEnabledRulesets()
        return sets.includes("ad_block_rules")
      }),
    )
    .toBe(false)

  const page = await context.newPage()
  await page.goto("https://example.com/")

  // An unblocked no-cors fetch to a real (but fabricated-path) URL still
  // resolves to an opaque response, yet Chrome/Playwright separately reports
  // the underlying request as a generic net::ERR_ABORTED requestfailed event
  // even on success — confirmed by direct comparison against the blocked
  // case, which reports the distinct net::ERR_BLOCKED_BY_CLIENT code. So the
  // only reliable signal that *our* rule blocked the request is that
  // specific error code; anything else (including ERR_ABORTED, or no failure
  // at all) means the request got through.
  let blockedErrorSeen = false
  page.on("requestfailed", (req) => {
    if (req.url().includes("googlesyndication.com") && req.failure()?.errorText === "net::ERR_BLOCKED_BY_CLIENT") {
      blockedErrorSeen = true
    }
  })

  const status = await page.evaluate(async () => {
    try {
      const res = await fetch("https://googlesyndication.com/pagead/e2e-probe", { mode: "no-cors" })
      return res.status
    } catch {
      return null
    }
  })

  expect(status).not.toBeNull()
  expect(blockedErrorSeen).toBe(false)
})
