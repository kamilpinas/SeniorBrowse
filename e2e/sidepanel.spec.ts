import { test, expect, waitForExtensionReady } from "./fixtures"

// B-02-ish: chrome.sidePanel is a native browser surface — Chrome doesn't
// expose it as a regular Playwright "page" target (confirmed directly: after
// a real click-triggered chrome.sidePanel.open() call, context.pages() never
// gains an entry for it, even though the panel demonstrably opened — see the
// session-storage and onOpened-broadcast assertions below). So these tests
// verify the real, observable side effects of the native panel actually
// opening: the sidePanel.onOpened listener firing (which only fires for a
// genuine native open, not just our code attempting one), the cross-tab
// PANEL_STATE broadcast, and the newtab page's own live re-render off
// storage.onChanged — none of which jsdom/vitest can exercise since there's
// no real chrome.sidePanel implementation to assert against.

test("the newtab panel-closed gate opens the real side panel", async ({
  context,
  extensionId,
  serviceWorker,
}) => {
  await waitForExtensionReady(serviceWorker)
  await serviceWorker.evaluate(() => chrome.storage.local.set({ config: { onboardingDone: true } }))

  const page = await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/newtab/index.html`)

  const openBtn = page.getByRole("button", { name: /Open your helper panel/i })
  await expect(openBtn).toBeVisible()
  await openBtn.click()

  // sidePanel.onOpened only fires for a real native panel open — this is the
  // service worker's own broadcastPanelState(true) confirming the gesture
  // actually worked, not just that our message handler ran.
  await expect
    .poll(() => serviceWorker.evaluate(() => chrome.storage.session.get("panelOpen")))
    .toEqual({ panelOpen: true })

  // The same newtab page re-renders live off storage.onChanged, moving past
  // the gate to the main dashboard.
  await expect(openBtn).not.toBeVisible()
  await expect(page.getByRole("button", { name: /Edit mode/ })).toBeVisible()
})

test("the content-script overlay on a closed panel opens the real side panel and broadcasts to every open tab", async ({
  context,
  serviceWorker,
}) => {
  await waitForExtensionReady(serviceWorker)
  // The overlay only renders when panelOpen is explicitly false (meaning the
  // panel was open before and got closed) — see content/index.ts's init().
  await serviceWorker.evaluate(() => chrome.storage.session.set({ panelOpen: false }))

  // Two real tabs on two real sites — proves the service worker's
  // broadcastPanelState() reaches every matching http(s) tab via
  // chrome.tabs.query + chrome.tabs.sendMessage, not just the tab that
  // triggered the open.
  const pageA = await context.newPage()
  await pageA.goto("https://example.com/")
  const pageB = await context.newPage()
  await pageB.goto("https://example.org/")

  const overlayBtnA = pageA.locator("#sw-closed-overlay-btn")
  const overlayB = pageB.locator("#sw-closed-overlay")
  await expect(overlayBtnA).toBeVisible()
  await expect(overlayBtnA).toHaveText("Open Helper Panel")
  await expect(overlayB).toBeVisible()

  await overlayBtnA.click()

  // The click handler hides tab A's own overlay optimistically, before the
  // OPEN_SIDE_PANEL round-trip to the service worker even resolves.
  await expect(pageA.locator("#sw-closed-overlay")).toHaveCount(0)

  await expect
    .poll(() => serviceWorker.evaluate(() => chrome.storage.session.get("panelOpen")))
    .toEqual({ panelOpen: true })

  // Tab B never clicked anything — its overlay only disappears via the real
  // PANEL_STATE broadcast that fires off the native onOpened event.
  await expect(overlayB).toHaveCount(0)
})
