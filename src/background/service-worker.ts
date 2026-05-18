// B-01: Service worker bootstrap + message routing.
// Wires together: admin toggle, safe-browsing, download blocker,
// activity logger, trial manager, and ad blocking.

import { storage } from "@shared/storage"
import type { Config } from "@shared/types"
import type { IncomingMessage, MessageResponse } from "@shared/messages"
import { checkUrl } from "./safetyCheck"
import { handleDownload } from "./downloadBlocker"
import { logActivity } from "./activityLogger"
import { ensureTrialStatus } from "./licenseManager"
import { updateAdBlocking } from "./adBlocker"

// ── Install / update ───────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    // Persist default config so future reads always deep-merge against it.
    const config = await storage.local.get("config")
    await storage.local.set("config", config)

    // Generate a stable device ID used to prevent repeated free trials from
    // the same browser even when different email addresses are entered.
    const existingId = await storage.local.get("installId")
    if (!existingId) {
      await storage.local.set("installId", crypto.randomUUID())
    }

    console.info("[SeniorBrowse] default config seeded")
  }
  await ensureTrialStatus()
  const config = await storage.local.get("config")
  await updateAdBlocking(config.security.blockAds)

  // Make the toolbar icon open/close the native side panel.
  // This replaces the old onClicked admin-toggle behaviour.
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })

  console.info("[SeniorBrowse] service worker ready")
})

// Refresh trial status every time the service worker wakes up.
ensureTrialStatus().catch(console.error)

// Re-apply panel behaviour on every worker wake-up (lost when SW is killed).
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(console.error)

// ── Real-time panel state via onClosed / onOpened (Chrome 141+/142+) ─────────
// These are the authoritative events — they fire for every open/close including
// the user clicking Chrome's own ✕ button.
// The SW broadcasts PANEL_STATE to all content-script tabs (via tabs.sendMessage)
// and updates session storage (read by extension pages such as the new tab).

type PanelEvent = { addListener(cb: (info: { windowId: number; tabId?: number }) => void): void }
const sp = chrome.sidePanel as unknown as { onClosed?: PanelEvent; onOpened?: PanelEvent }

async function broadcastPanelState(open: boolean): Promise<void> {
  await chrome.storage.session.set({ panelOpen: open })
  const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] })
  for (const tab of tabs) {
    if (tab.id != null) {
      chrome.tabs.sendMessage(tab.id, { type: "PANEL_STATE", open }).catch(() => {})
    }
  }
}

sp.onClosed?.addListener(() => { broadcastPanelState(false).catch(console.error) })
sp.onOpened?.addListener(() => { broadcastPanelState(true).catch(console.error) })

// ── Admin mode broadcast ──────────────────────────────────────────────────────
// After the session key is written, fan out ADMIN_MODE_CHANGED to every open
// extension view (newtab page, side panel) so they sync without a page reload.
function broadcastAdminMode(active: boolean): void {
  chrome.runtime.sendMessage({ type: "ADMIN_MODE_CHANGED", payload: { active } })
    .catch(() => {}) // throws if no listener open — safe to ignore
}

// ── Panel open / close from the content-script floating button ───────────
// Handled separately so we have access to sender.tab.windowId.
chrome.runtime.onMessage.addListener(
  (msg: unknown, sender: chrome.runtime.MessageSender, sendResponse) => {
    if (!msg || typeof msg !== "object") return
    const type = (msg as { type?: string }).type
    if (type === "OPEN_SIDE_PANEL") {
      // sender.tab.windowId is set for content scripts; for extension pages
      // (like the new-tab override) sender.tab may be absent — fall back to
      // querying the focused window so both callers work.
      const openPanel = async () => {
        const windowId =
          sender.tab?.windowId ??
          (await chrome.windows.getCurrent()).id
        if (windowId != null) await chrome.sidePanel.open({ windowId })
      }
      openPanel()
        .then(() => sendResponse({ ok: true, data: undefined }))
        .catch((e) => sendResponse({ ok: false, error: String(e) }))
      return true
    }

  },
)

// ── Message routing (B-01) ────────────────────────────────────────────────
// Note: toolbar icon click is now handled by chrome.sidePanel (openPanelOnActionClick).
// Admin mode is toggled from the side panel's PIN entry or the newtab 🔒 button.

chrome.runtime.onMessage.addListener(
  (
    msg: IncomingMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (r: MessageResponse) => void,
  ) => {
    void handleMessage(msg).then(sendResponse)
    return true // keep channel open for async response
  },
)

async function handleMessage(msg: IncomingMessage): Promise<MessageResponse> {
  try {
    switch (msg.type) {
      case "TOGGLE_ADMIN_MODE": {
        const current = await storage.session.get("adminModeActive")
        const next = !current
        await storage.session.set("adminModeActive", next)
        broadcastAdminMode(next)
        return { ok: true, data: { active: next } }
      }

      case "SET_ADMIN_MODE": {
        await storage.session.set("adminModeActive", msg.payload.active)
        broadcastAdminMode(msg.payload.active)
        return { ok: true, data: { active: msg.payload.active } }
      }

      case "CHECK_TRIAL_STATUS": {
        await ensureTrialStatus()
        const sub = await storage.local.get("subscription")
        return { ok: true, data: sub }
      }

      case "LOG_ACTIVITY": {
        const { url, title, type } = msg.payload
        await logActivity(url, title, type)
        return { ok: true, data: undefined }
      }

      case "BYPASS_URL": {
        const { url } = msg.payload
        const bypassed = await storage.session.get("bypassedUrls")
        if (!bypassed.includes(url)) {
          await storage.session.set("bypassedUrls", [...bypassed, url])
        }
        return { ok: true, data: undefined }
      }

      case "OPEN_SIDE_PANEL":
        // Handled by the dedicated listener above that has access to sender.tab.
        return { ok: true, data: undefined }

      default: {
        // TypeScript exhaustiveness guard.
        const _never: never = msg
        return {
          ok: false,
          error: `Unknown message type: ${(_never as { type: string }).type}`,
        }
      }
    }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// ── Navigation filter — B-02 (Safe Browsing) + B-06 (whitelist/blacklist) ─

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Main frame only; ignore iframes, pre-renders, etc.
  if (details.frameId !== 0) return

  const { url, tabId } = details
  if (!url.startsWith("http://") && !url.startsWith("https://")) return

  const [config, bypassedUrls] = await Promise.all([
    storage.local.get("config"),
    storage.session.get("bypassedUrls"),
  ])

  // User explicitly bypassed this URL in the current session.
  if (bypassedUrls.includes(url)) return

  let hostname: string
  try {
    hostname = new URL(url).hostname
  } catch {
    return // malformed URL — let it through
  }

  // B-06: Hard blacklist check.
  const isBlacklisted = config.security.blacklist.some(
    (h) => hostname === h || hostname.endsWith(`.${h}`),
  )
  if (isBlacklisted) {
    await redirectTab(
      tabId,
      `blocked.html?url=${encodeURIComponent(url)}&reason=blacklist`,
    )
    return
  }

  // B-06: Whitelist bypasses safe-browsing entirely.
  const isWhitelisted = config.security.whitelist.some(
    (h) => hostname === h || hostname.endsWith(`.${h}`),
  )
  if (isWhitelisted) return

  // B-02: Safe Browsing check.
  if (config.security.blockSuspiciousLinks === "off") return

  const threat = await checkUrl(url)
  if (threat === "safe") return

  if (config.security.blockSuspiciousLinks === "warn") {
    // Warn mode: always offer a bypass regardless of threat severity.
    await redirectTab(
      tabId,
      `warn.html?url=${encodeURIComponent(url)}&reason=safebrowsing`,
    )
  } else {
    // Block mode: hard-block malware; soft-warn for social-engineering.
    const page = threat === "warn" ? "warn.html" : "blocked.html"
    await redirectTab(
      tabId,
      `${page}?url=${encodeURIComponent(url)}&reason=safebrowsing`,
    )
  }
})

async function redirectTab(tabId: number, relativeUrl: string): Promise<void> {
  try {
    await chrome.tabs.update(tabId, { url: chrome.runtime.getURL(relativeUrl) })
  } catch (err) {
    console.warn("[SeniorBrowse] redirect failed:", err)
  }
}

// ── Download blocker (B-03) ───────────────────────────────────────────────

chrome.downloads.onCreated.addListener(async (item) => {
  const config = await storage.local.get("config")
  await handleDownload(item, config.security.blockDownloads)
})

// ── Activity logger (B-04) ────────────────────────────────────────────────

// Zoom factor for each font-size name — mirrors the mapping in sidepanel/App.tsx.
const FONT_ZOOM: Record<string, number> = { normal: 1, large: 1.25, xlarge: 1.5 }

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return
  const url = tab.url ?? ""
  const title = tab.title ?? url
  if (!url.startsWith("http://") && !url.startsWith("https://")) return
  await logActivity(url, title, "visit")

  // Read panel state and font size together in one call.
  const sessionData = await chrome.storage.session.get(["panelOpen", "currentFontSize"])
  const sd = sessionData as { panelOpen?: boolean; currentFontSize?: string }

  // Push the current panel state to the freshly loaded content script.
  // A content script that loads AFTER the panel was closed won't have
  // received the PANEL_STATE broadcast that fired at close time, so we
  // re-send it here once the page (and content script) are ready.
  if (sd.panelOpen !== undefined) {
    chrome.tabs.sendMessage(tabId, { type: "PANEL_STATE", open: sd.panelOpen }).catch(() => {})
  }

  // Restore the user's preferred zoom level.
  // chrome.tabs.setZoom resets on navigation in some Chrome versions, so
  // we re-apply it every time a page finishes loading.
  const zoomFactor = FONT_ZOOM[sd.currentFontSize ?? "normal"] ?? 1
  if (zoomFactor !== 1) {
    chrome.tabs.setZoom(tabId, zoomFactor).catch(() => {})
  }
})

// ── Config changes → sync ad blocking (B-07) ──────────────────────────────

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "local") return
  const change = changes["config"]
  if (!change) return
  const newConfig = change.newValue as Config | undefined
  if (newConfig?.security?.blockAds !== undefined) {
    await updateAdBlocking(newConfig.security.blockAds)
  }
})
