import { test, expect } from "./fixtures"

test("loads the unpacked extension and boots the service worker", async ({
  serviceWorker,
  extensionId,
}) => {
  expect(extensionId).toMatch(/^[a-z]{32}$/)

  const runtimeId = await serviceWorker.evaluate(() => chrome.runtime.id)
  expect(runtimeId).toBe(extensionId)
})

test("overrides chrome://newtab with the real newtab page", async ({ context, extensionId }) => {
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/newtab/index.html`)

  // Onboarding hasn't run yet in a fresh profile, so the wizard's welcome
  // step is the first thing a senior (or a fresh install) ever sees.
  await expect(page.getByRole("button", { name: /Start setup/ })).toBeVisible()
})
