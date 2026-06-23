import { test, expect, waitForExtensionReady } from "./fixtures"

// B-06: the hard blacklist is checked entirely inside the background service
// worker's chrome.webNavigation.onBeforeNavigate listener, before Safe
// Browsing is even consulted — this is real extension behaviour that no
// component test (jsdom, no content scripts, no webNavigation) can reach.

test("blocks navigation to a blacklisted hostname and redirects to blocked.html", async ({
  context,
  serviceWorker,
}) => {
  await waitForExtensionReady(serviceWorker)
  await serviceWorker.evaluate(() =>
    chrome.storage.local.set({ config: { security: { blacklist: ["example.com"] } } }),
  )

  const page = await context.newPage()
  await page.goto("https://example.com/", { waitUntil: "commit" }).catch(() => {})

  await expect(page).toHaveURL(/\/blocked\.html\?/)
  expect(page.url()).toContain(encodeURIComponent("https://example.com/"))
  await expect(page.getByRole("heading", { name: /not available/i })).toBeVisible()
})

test("does not block navigation to a hostname that isn't on any list", async ({
  context,
  serviceWorker,
}) => {
  // No blacklist entries, and the default-blocking e2e route makes the Safe
  // Browsing proxy call fail — safetyCheck.ts fails open on any error, so
  // this should load straight through with no redirect.
  await waitForExtensionReady(serviceWorker)
  await serviceWorker.evaluate(() =>
    chrome.storage.local.set({ config: { security: { blacklist: [] } } }),
  )

  const page = await context.newPage()
  await page.goto("https://example.org/", { waitUntil: "load" })

  await expect(page).toHaveURL("https://example.org/")
})

test("the blacklist takes precedence when a hostname is on both lists", async ({
  context,
  serviceWorker,
}) => {
  await waitForExtensionReady(serviceWorker)
  await serviceWorker.evaluate(() =>
    chrome.storage.local.set({
      config: { security: { blacklist: ["example.com"], whitelist: ["example.com"] } },
    }),
  )

  const page = await context.newPage()
  await page.goto("https://example.com/", { waitUntil: "commit" }).catch(() => {})

  // service-worker.ts checks the blacklist before the whitelist, so a
  // hostname on both lists still gets blocked — pin that precedence here
  // since it's real background logic no component test can exercise.
  await expect(page).toHaveURL(/\/blocked\.html\?/)
})
