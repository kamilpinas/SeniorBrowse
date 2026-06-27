import { test as base, chromium, type BrowserContext, type Worker } from "@playwright/test"
import { mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pathToExtension = path.join(__dirname, "..", "dist")

// service-worker.ts fires a malware-list refresh against this real public
// feed on every wake (src/background/malwareBlocklist.ts) — block it by
// default so every E2E test doesn't depend on a live third party / real
// network. It fails open (leaves storage.local.malwareList untouched), so
// blocking it here is harmless for tests that don't care about the malware
// list. Tests that do (malwareBlocklist.spec.ts) add their own route for
// this same pattern — the most-recently-registered matching handler wins.
const MALWARE_FEED_PATTERN = "https://urlhaus.abuse.ch/downloads/hostfile/**"

export const test = base.extend<{
  context: BrowserContext
  extensionId: string
  serviceWorker: Worker
}>({
  context: async ({}, use) => {
    // chrome.downloads.download() (used by the B-03 download-blocking tests)
    // goes through the browser's real download manager, not Playwright's
    // page-level download interception — without an explicit downloadsPath
    // it would write files into the real OS Downloads folder.
    const downloadsDir = await mkdtemp(path.join(os.tmpdir(), "seniorbrowse-e2e-downloads-"))
    const context = await chromium.launchPersistentContext("", {
      headless: false,
      downloadsPath: downloadsDir,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    })
    await context.route(MALWARE_FEED_PATTERN, (route) =>
      route.fulfill({ status: 503, body: "blocked-in-e2e-by-default" }),
    )
    await use(context)
    await context.close()
    await rm(downloadsDir, { recursive: true, force: true })
  },

  serviceWorker: async ({ context }, use) => {
    let [worker] = context.serviceWorkers()
    if (!worker) worker = await context.waitForEvent("serviceworker")
    await use(worker)
  },

  extensionId: async ({ serviceWorker }, use) => {
    const id = serviceWorker.url().split("/")[2]
    await use(id)
  },
})

export const expect = test.expect

/**
 * On a fresh profile, chrome.runtime.onInstalled asynchronously seeds the
 * default `config` into storage (service-worker.ts). A test that writes its
 * own storage state immediately after the fixture resolves can race that
 * seeding and get clobbered, so polling for `config` to land is a reliable
 * way to wait the race out before seeding test data.
 */
export async function waitForExtensionReady(serviceWorker: Worker): Promise<void> {
  await test.step("wait for onInstalled config seeding to settle", async () => {
    await base.expect
      .poll(() => serviceWorker.evaluate(() => chrome.storage.local.get("config")))
      .not.toEqual({})
  })
}
