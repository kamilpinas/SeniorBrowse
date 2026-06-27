import { test, expect, waitForExtensionReady } from "./fixtures"

// B-06: the hard blacklist is checked entirely inside the background service
// worker's chrome.webNavigation.onBeforeNavigate listener — this is real
// extension behaviour that no component test (jsdom, no content scripts, no
// webNavigation) can reach.

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

test("does not block navigation to a hostname that isn't on the blacklist", async ({
  context,
  serviceWorker,
}) => {
  await waitForExtensionReady(serviceWorker)
  await serviceWorker.evaluate(() =>
    chrome.storage.local.set({ config: { security: { blacklist: [] } } }),
  )

  const page = await context.newPage()
  await page.goto("https://example.org/", { waitUntil: "load" })

  await expect(page).toHaveURL("https://example.org/")
})
