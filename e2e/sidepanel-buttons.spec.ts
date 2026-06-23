import { test, expect, waitForExtensionReady } from "./fixtures"
import type { BrowserContext, Page, Worker } from "@playwright/test"

// The side panel itself can't be captured as a Playwright page target (see
// sidepanel.spec.ts), but chrome-extension://<id>/sidepanel/index.html is an
// ordinary extension page underneath — confirmed via raw CDP Target.getTargets,
// which lists it as a plain "page" target identical to newtab/index.html. So
// every test below loads that URL directly via context.newPage() to exercise
// the real React component and its real chrome.* calls/handlers.
//
// The one difference from production: the native panel is permanently docked
// outside the tab strip, so it's never "the active tab" that handlers like
// handleHome/handleBack/handleSave operate on. Here the panel page IS a tab,
// so every test explicitly re-activates the real content tab (via
// chrome.tabs.update) before clicking a button whose handler reads
// chrome.tabs.query({active:true, currentWindow:true}) — exactly mirroring
// what the real docked panel relies on the browser to do automatically.

async function seedPanelReady(serviceWorker: Worker) {
  await waitForExtensionReady(serviceWorker)
  await serviceWorker.evaluate(() =>
    chrome.storage.local.set({ config: { onboardingDone: true, panelWizardDone: true } }),
  )
}

async function openPanelPage(context: BrowserContext, extensionId: string): Promise<Page> {
  const panel = await context.newPage()
  await panel.goto(`chrome-extension://${extensionId}/sidepanel/index.html`)
  return panel
}

async function activateTabByUrl(serviceWorker: Worker, urlSubstring: string) {
  await serviceWorker.evaluate(async (substr) => {
    const tabs = await chrome.tabs.query({})
    const tab = tabs.find((t) => t.url?.includes(substr))
    if (tab?.id != null) await chrome.tabs.update(tab.id, { active: true })
  }, urlSubstring)
}

test("HOME navigates the real active tab to the new tab page", async ({
  context,
  extensionId,
  serviceWorker,
}) => {
  await seedPanelReady(serviceWorker)
  const contentPage = await context.newPage()
  await contentPage.goto("https://example.com/")
  const panel = await openPanelPage(context, extensionId)
  await activateTabByUrl(serviceWorker, "example.com")

  await panel.getByRole("button", { name: "HOME" }).click()

  await contentPage.waitForURL(`chrome-extension://${extensionId}/newtab/index.html`)
})

test("BACK and FORWARD navigate real tab history and warn when there's nowhere to go", async ({
  context,
  extensionId,
  serviceWorker,
}) => {
  await seedPanelReady(serviceWorker)
  const contentPage = await context.newPage()
  await contentPage.goto("https://example.com/")
  await contentPage.goto("https://example.org/")
  const panel = await openPanelPage(context, extensionId)
  await activateTabByUrl(serviceWorker, "example.org")

  await panel.getByRole("button", { name: "BACK", exact: true }).click()
  await contentPage.waitForURL("https://example.com/")

  await panel.getByRole("button", { name: "FORWARD", exact: true }).click()
  await contentPage.waitForURL("https://example.org/")

  // example.org is the front of history — there's nowhere forward to go.
  await panel.getByRole("button", { name: "FORWARD", exact: true }).click()
  await expect(panel.getByText("Nothing to go forward to")).toBeVisible()
})

test("BACK warns when the active tab has no history to go back to", async ({
  context,
  extensionId,
  serviceWorker,
}) => {
  await seedPanelReady(serviceWorker)
  const contentPage = await context.newPage()
  await contentPage.goto("https://example.com/")
  const panel = await openPanelPage(context, extensionId)
  await activateTabByUrl(serviceWorker, "example.com")

  const backBtn = panel.getByRole("button", { name: "BACK", exact: true })
  // A brand-new tab's history still has one entry behind example.com (its
  // initial about:blank) — the first BACK is a real navigation, not a no-op.
  await backBtn.click()
  await contentPage.waitForURL("about:blank")

  // Now there's truly nowhere further back to go.
  await backBtn.click()
  await expect(panel.getByText("Nothing to go back to")).toBeVisible()
})

test("MOVE PAGE scrolls the real active tab down, up, and back to top", async ({
  context,
  extensionId,
  serviceWorker,
}) => {
  await seedPanelReady(serviceWorker)
  const contentPage = await context.newPage()
  await contentPage.goto("https://example.com/")
  await contentPage.evaluate(() => {
    document.body.style.minHeight = "5000px"
  })
  const panel = await openPanelPage(context, extensionId)
  await activateTabByUrl(serviceWorker, "example.com")

  const scrollY = () => contentPage.evaluate(() => window.scrollY)

  await panel.getByRole("button", { name: "DOWN" }).click()
  await panel.getByRole("button", { name: "DOWN" }).click()
  await expect.poll(scrollY).toBeGreaterThan(0)
  const afterTwoDown = await scrollY()

  await panel.getByRole("button", { name: "UP" }).click()
  await expect.poll(scrollY).toBeLessThan(afterTwoDown)
  await expect.poll(scrollY).toBeGreaterThan(0)

  await panel.getByRole("button", { name: /BACK TO TOP/i }).click()
  await expect.poll(scrollY).toBe(0)
})

test("TEXT SIZE cycles the real active tab's zoom level", async ({
  context,
  extensionId,
  serviceWorker,
}) => {
  await seedPanelReady(serviceWorker)
  const contentPage = await context.newPage()
  await contentPage.goto("https://example.com/")
  const panel = await openPanelPage(context, extensionId)
  await activateTabByUrl(serviceWorker, "example.com")

  const getZoom = () =>
    serviceWorker.evaluate(async () => {
      const tabs = await chrome.tabs.query({})
      const tab = tabs.find((t) => t.url?.includes("example.com"))
      return tab?.id != null ? chrome.tabs.getZoom(tab.id) : null
    })

  const zoomBtn = panel.getByRole("button", { name: /TEXT SIZE/i })
  await expect.poll(getZoom).toBeCloseTo(1, 2)

  await zoomBtn.click()
  await expect.poll(getZoom).toBeCloseTo(1.25, 2)

  await zoomBtn.click()
  await expect.poll(getZoom).toBeCloseTo(1.5, 2)

  // Cycles back to normal.
  await zoomBtn.click()
  await expect.poll(getZoom).toBeCloseTo(1, 2)
})

test("VOLUME adjusts and mutes a real <video> in the active tab", async ({
  context,
  extensionId,
  serviceWorker,
}) => {
  await seedPanelReady(serviceWorker)
  const contentPage = await context.newPage()
  await contentPage.goto("https://example.com/")
  await contentPage.evaluate(() => {
    const v = document.createElement("video")
    v.id = "e2e-video"
    v.volume = 1
    document.body.appendChild(v)
  })
  const panel = await openPanelPage(context, extensionId)
  await activateTabByUrl(serviceWorker, "example.com")

  const getVolume = () =>
    contentPage.evaluate(() => (document.getElementById("e2e-video") as HTMLVideoElement).volume)
  const getMuted = () =>
    contentPage.evaluate(() => (document.getElementById("e2e-video") as HTMLVideoElement).muted)

  await panel.getByRole("button", { name: /LESS/i }).click()
  await expect.poll(getVolume).toBeCloseTo(0.9, 2)

  await panel.getByRole("button", { name: /MORE/i }).click()
  await expect.poll(getVolume).toBeCloseTo(1, 2)

  await panel.getByRole("button", { name: /MUTE/i }).click()
  await expect.poll(getMuted).toBe(true)
  await expect.poll(getVolume).toBe(0)

  await panel.getByRole("button", { name: /UNMUTE/i }).click()
  await expect.poll(getMuted).toBe(false)
  await expect.poll(getVolume).toBeGreaterThan(0)
})

test("SAVE PAGE saves the active http(s) tab and rejects non-http(s) tabs", async ({
  context,
  extensionId,
  serviceWorker,
}) => {
  await seedPanelReady(serviceWorker)
  const contentPage = await context.newPage()
  await contentPage.goto("https://example.com/")
  const panel = await openPanelPage(context, extensionId)
  await activateTabByUrl(serviceWorker, "example.com")

  await panel.getByRole("button", { name: "SAVE PAGE" }).click()
  await expect
    .poll(() =>
      serviceWorker.evaluate(
        () =>
          chrome.storage.local
            .get("savedLinks")
            .then((r) => (r["savedLinks"] as Array<{ url: string }> | undefined)?.some(
              (l) => l.url === "https://example.com/",
            )),
      ),
    )
    .toBe(true)

  // The panel page's own chrome-extension:// URL isn't http(s) — rejected.
  await activateTabByUrl(serviceWorker, "sidepanel/index.html")
  await panel.getByRole("button", { name: "SAVE PAGE" }).click()
  await expect(panel.getByText(/can't be saved/i)).toBeVisible()
})

test("FULLSCREEN toggles the real browser window state", async ({
  context,
  extensionId,
  serviceWorker,
}) => {
  await seedPanelReady(serviceWorker)
  const panel = await openPanelPage(context, extensionId)

  const getWindowState = () =>
    serviceWorker.evaluate(() => chrome.windows.getCurrent().then((w) => w.state))

  await panel.getByRole("button", { name: "FULLSCREEN" }).click()
  await expect.poll(getWindowState).toBe("fullscreen")
  await expect(panel.getByRole("button", { name: "SHRINK" })).toBeVisible()

  await panel.getByRole("button", { name: "SHRINK" }).click()
  await expect.poll(getWindowState).toBe("normal")
  await expect(panel.getByRole("button", { name: "FULLSCREEN" })).toBeVisible()
})

test("REFRESH reloads the real active tab", async ({ context, extensionId, serviceWorker }) => {
  await seedPanelReady(serviceWorker)
  const contentPage = await context.newPage()
  await contentPage.goto("https://example.com/")
  await contentPage.evaluate(() => {
    ;(window as unknown as { __e2eMarker: boolean }).__e2eMarker = true
  })
  const panel = await openPanelPage(context, extensionId)
  await activateTabByUrl(serviceWorker, "example.com")

  const loadPromise = contentPage.waitForEvent("load")
  await panel.getByRole("button", { name: "REFRESH" }).click()
  await loadPromise

  await expect
    .poll(() => contentPage.evaluate(() => (window as unknown as { __e2eMarker?: boolean }).__e2eMarker))
    .toBeUndefined()
})

test("CLOSE PAGE closes the active tab directly when it isn't the last tab", async ({
  context,
  extensionId,
  serviceWorker,
}) => {
  await seedPanelReady(serviceWorker)
  const contentPage = await context.newPage()
  await contentPage.goto("https://example.com/")
  const panel = await openPanelPage(context, extensionId)
  await activateTabByUrl(serviceWorker, "example.com")

  await expect(panel.getByRole("button", { name: "CLOSE PAGE" })).toBeVisible()
  await panel.getByRole("button", { name: "CLOSE PAGE" }).click()

  // chrome.tabs.remove() closes the tab fast enough that waitForEvent("close")
  // can miss the event entirely (it fires before the listener attaches) —
  // poll the already-up-to-date isClosed() flag instead.
  await expect.poll(() => contentPage.isClosed()).toBe(true)
})

test("CLOSE PAGE asks for confirmation and closes the browser when it is the last tab", async ({
  context,
  extensionId,
  serviceWorker,
}) => {
  await seedPanelReady(serviceWorker)
  // Open the panel page before closing the other tabs — closing every page
  // on a persistent context (even momentarily) tears down the whole browser.
  const otherPages = context.pages()
  const panel = await openPanelPage(context, extensionId)
  for (const p of otherPages) await p.close()

  await expect(panel.getByRole("button", { name: "CLOSE BROWSER" })).toBeVisible()
  await panel.getByRole("button", { name: "CLOSE BROWSER" }).click()

  await expect(panel.getByRole("dialog")).toBeVisible()
  await expect(panel.getByText("Close the whole browser?")).toBeVisible()

  await panel.getByRole("button", { name: "Yes, close browser" }).click()
  await expect.poll(() => panel.isClosed()).toBe(true)
})
