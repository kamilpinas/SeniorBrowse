import { test, expect, waitForExtensionReady } from "./fixtures"

// B-03: chrome.downloads.onCreated → handleDownload() cancels+erases the
// download before any bytes hit disk. This is real browser download-manager
// behaviour that jsdom/vitest can't exercise — there's no actual
// chrome.downloads implementation to assert against in a mock.

test("blocks a real download by default and erases it from the downloads list", async ({
  serviceWorker,
}) => {
  await waitForExtensionReady(serviceWorker)

  const downloadId = await serviceWorker.evaluate(
    () =>
      new Promise<number>((resolve) =>
        chrome.downloads.download({ url: "https://example.com/", filename: "e2e-blocked.html" }, (id) =>
          resolve(id),
        ),
      ),
  )

  await expect
    .poll(() =>
      serviceWorker.evaluate(
        (id) => chrome.downloads.search({ id }).then((r) => r.length),
        downloadId,
      ),
    )
    .toBe(0)
})

test("lets a download through when blockDownloads is disabled", async ({ serviceWorker }) => {
  await waitForExtensionReady(serviceWorker)
  await serviceWorker.evaluate(() =>
    chrome.storage.local.set({ config: { security: { blockDownloads: false } } }),
  )

  const downloadId = await serviceWorker.evaluate(
    () =>
      new Promise<number>((resolve) =>
        chrome.downloads.download({ url: "https://example.com/", filename: "e2e-allowed.html" }, (id) =>
          resolve(id),
        ),
      ),
  )

  await expect
    .poll(() =>
      serviceWorker.evaluate(
        (id) => chrome.downloads.search({ id }).then((r) => r[0]?.state),
        downloadId,
      ),
    )
    .toBe("complete")

  await serviceWorker.evaluate((id) => chrome.downloads.removeFile(id).catch(() => {}), downloadId)
})

test("never blocks the caregiver's own blob:chrome-extension:// backup download", async ({
  context,
  extensionId,
  serviceWorker,
}) => {
  await waitForExtensionReady(serviceWorker)
  // blockDownloads stays at its default (true) — the exemption must hold
  // even when blocking is otherwise active.

  // Mirrors the real Settings → Save backup flow (SettingsModal.tsx): the
  // blob URL is created in an extension *page* via a clicked <a download>,
  // not via chrome.downloads.download() called from the service worker —
  // URL.createObjectURL isn't even available in the MV3 service worker's
  // global scope, confirmed by trying it there directly.
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/newtab/index.html`)
  const downloadPromise = page.waitForEvent("download")
  await page.evaluate(() => {
    const blobUrl = URL.createObjectURL(new Blob(["{}"], { type: "application/json" }))
    const a = document.createElement("a")
    a.href = blobUrl
    a.download = "e2e-backup.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  })
  const download = await downloadPromise
  expect(download.url()).toMatch(/^blob:chrome-extension:\/\//)

  // Playwright's own download interception saves the file on disk under a
  // generated name (the suggested "e2e-backup.json" filename only surfaces
  // via download.suggestedFilename()), so look this up by URL instead.
  const findDownloadId = () =>
    serviceWorker.evaluate(() =>
      chrome.downloads
        .search({ urlRegex: "^blob:chrome-extension://" })
        .then((r) => r[0]?.id),
    )
  await expect.poll(findDownloadId).not.toBeUndefined()
  const downloadId = (await findDownloadId()) as number

  await expect
    .poll(() =>
      serviceWorker.evaluate(
        (id) => chrome.downloads.search({ id }).then((r) => r[0]?.state),
        downloadId,
      ),
    )
    .toBe("complete")

  await serviceWorker.evaluate((id) => chrome.downloads.removeFile(id).catch(() => {}), downloadId)
})
