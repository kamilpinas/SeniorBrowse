import { test as base, chromium, type BrowserContext, type Worker } from "@playwright/test"
import { mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pathToExtension = path.join(__dirname, "..", "dist")

// Every Supabase edge function this extension calls (register-license,
// validate-license, check-url) is baked into the build as a real production
// URL — Vite inlines VITE_SUPABASE_URL at build time, so there's no
// equivalent here of vitest's `vi.stubGlobal("fetch", ...)`. Block all of
// them by default at the network layer so a test that forgets to mock a
// specific call fails loudly instead of quietly hitting production. Tests
// that need a real response add their own context.route() for the same
// pattern — the most-recently-registered matching handler runs first.
const SUPABASE_FUNCTIONS_PATTERN = "**/functions/v1/**"

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
    await context.route(SUPABASE_FUNCTIONS_PATTERN, (route) =>
      route.fulfill({ status: 503, body: JSON.stringify({ error: "blocked-in-e2e-by-default" }) }),
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
 * default `config` into storage (service-worker.ts), then writes
 * `installId`. A test that writes its own storage state immediately after
 * the fixture resolves can race that seeding and get clobbered — installId
 * only appears once the config write has already landed, so polling for it
 * is a reliable way to wait the race out before seeding test data.
 */
export async function waitForExtensionReady(serviceWorker: Worker): Promise<void> {
  await test.step("wait for onInstalled config seeding to settle", async () => {
    await base.expect
      .poll(() => serviceWorker.evaluate(() => chrome.storage.local.get("installId")))
      .not.toEqual({})
  })
}
