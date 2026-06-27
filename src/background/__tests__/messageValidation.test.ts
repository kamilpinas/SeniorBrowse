// Verifies that the service worker's message handlers only accept
// state-mutating messages (admin mode, activity log) from the extension's
// own pages — never from a content script running in a web page, even
// though both report the same chrome.runtime.id.
//
// The module registers two chrome.runtime.onMessage listeners at import
// time; we re-import it fresh (with vi.resetModules) for every test against
// a brand-new chrome mock, then invoke the captured listener directly.

import { describe, it, expect, vi } from "vitest"
import { installChromeMock } from "../../__tests__/helpers/chromeMock"

// Service-worker.ts fires off a malware-list refresh on import — mock it out
// so these tests never make a real network call to the public threat feed.
vi.mock("../malwareBlocklist", () => ({
  refreshRemoteList: vi.fn(async () => {}),
  getMalwareDomainSet: vi.fn(async () => new Set<string>()),
}))

type Sender = {
  id?: string
  url?: string
  tab?: { id: number; windowId: number }
}

async function loadServiceWorker() {
  vi.resetModules()
  const mock = installChromeMock()
  await import("../service-worker")
  const storageModule = await import("@shared/storage")
  const mainListener = mock._onMessageListeners.at(-1)!
  return { mock, mainListener, storage: storageModule.storage }
}

function send(
  mainListener: (msg: unknown, sender: unknown, sendResponse: (r: unknown) => void) => unknown,
  msg: unknown,
  sender: Sender,
): Promise<unknown> {
  return new Promise((resolve) => {
    mainListener(msg, sender, resolve)
  })
}

const extensionSender: Sender = {
  id: "test-extension-id",
  url: "chrome-extension://test-extension-id/sidepanel/index.html",
}

// Content scripts report the host extension's id (sender.id is always the
// injecting extension's own id), but sender.url is the *page's* http(s) URL
// — that's the actual signal isExtensionPageSender relies on.
const webPageSender: Sender = {
  id: "test-extension-id",
  url: "https://evil-site.example/page.html",
  tab: { id: 1, windowId: 1 },
}

const otherExtensionSender: Sender = {
  id: "some-other-extension-id",
  url: "chrome-extension://some-other-extension-id/page.html",
}

const noUrlSender: Sender = { id: "test-extension-id" }

describe("message validation — gated message types", () => {
  const cases: Array<{ type: string; msg: unknown }> = [
    { type: "TOGGLE_ADMIN_MODE", msg: { type: "TOGGLE_ADMIN_MODE" } },
    { type: "SET_ADMIN_MODE", msg: { type: "SET_ADMIN_MODE", payload: { active: true } } },
    {
      type: "LOG_ACTIVITY",
      msg: { type: "LOG_ACTIVITY", payload: { url: "https://x.com", title: "x", type: "visit" } },
    },
  ]

  for (const { type, msg } of cases) {
    it(`rejects ${type} from a content-script (web page) sender`, async () => {
      const { mainListener } = await loadServiceWorker()
      const res = await send(mainListener, msg, webPageSender)
      expect(res).toEqual({ ok: false, error: "Forbidden" })
    })

    it(`rejects ${type} from a different extension's sender`, async () => {
      const { mainListener } = await loadServiceWorker()
      const res = await send(mainListener, msg, otherExtensionSender)
      expect(res).toEqual({ ok: false, error: "Forbidden" })
    })

    it(`rejects ${type} when sender.url is missing`, async () => {
      const { mainListener } = await loadServiceWorker()
      const res = await send(mainListener, msg, noUrlSender)
      expect(res).toEqual({ ok: false, error: "Forbidden" })
    })

    it(`accepts ${type} from a genuine extension-page sender`, async () => {
      const { mainListener } = await loadServiceWorker()
      const res = await send(mainListener, msg, extensionSender)
      expect(res).toMatchObject({ ok: true })
    })
  }
})

describe("message validation — side effects only apply for legitimate senders", () => {
  it("does not flip admin mode when TOGGLE_ADMIN_MODE is rejected", async () => {
    const { mainListener, storage } = await loadServiceWorker()
    await send(mainListener, { type: "TOGGLE_ADMIN_MODE" }, webPageSender)
    await expect(storage.session.get("adminModeActive")).resolves.toBe(false)
  })

  it("flips admin mode on TOGGLE_ADMIN_MODE from an extension page", async () => {
    const { mainListener, storage } = await loadServiceWorker()
    const res = await send(mainListener, { type: "TOGGLE_ADMIN_MODE" }, extensionSender)
    expect(res).toEqual({ ok: true, data: { active: true } })
    await expect(storage.session.get("adminModeActive")).resolves.toBe(true)
  })

  it("does not record an activity-log entry when LOG_ACTIVITY is rejected", async () => {
    const { mainListener, storage } = await loadServiceWorker()
    await send(
      mainListener,
      { type: "LOG_ACTIVITY", payload: { url: "https://x.com", title: "x", type: "visit" } },
      webPageSender,
    )
    await expect(storage.local.get("activityLog")).resolves.toEqual([])
  })
})

