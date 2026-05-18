// Content script — per-page helpers for the SeniorBrowse side panel.
// The visual panel is now a native Chrome Side Panel (sidepanel/index.html).
// This script handles:
//   • TAB_COMMAND messages from the side panel (scrollTop)
//   • Floating "Panel" open button
//   • Full-screen overlay when the panel is closed (guides seniors to reopen it)
//
// Text zoom is applied via chrome.tabs.setZoom() in the service worker and
// side panel — that works universally on all sites regardless of their CSS.

import { storage } from "@shared/storage"
import type { TabCommand } from "@shared/messages"

// Skip extension-internal pages
if (
  location.protocol !== "chrome-extension:" &&
  location.protocol !== "chrome:" &&
  location.protocol !== "about:"
) {
  void init()
}

// ── Floating panel-open button ────────────────────────────────────────────────

function injectPanelButton() {
  if (document.getElementById("sw-panel-btn")) return

  const styleEl = document.createElement("style")
  styleEl.id = "sw-panel-btn-style"
  styleEl.textContent = `
    @keyframes sw-pulse {
      0%, 100% { box-shadow: 0 1px 2px rgba(42,38,32,0.06), 0 6px 20px rgba(42,38,32,0.10); }
      50%       { box-shadow: 0 1px 2px rgba(42,38,32,0.06), 0 6px 20px rgba(42,38,32,0.10),
                              0 0 0 6px rgba(180,100,40,0.28); }
    }
    #sw-panel-btn {
      position:      fixed;
      bottom:        1.25rem;
      left:          1.25rem;
      z-index:       2147483644;
      display:       flex;
      align-items:   center;
      gap:           0.4rem;
      padding:       0.55rem 1rem;
      background:    #faf6ee;
      border:        1.5px solid #ddd4be;
      border-radius: 12px;
      font-size:     0.875rem;
      font-weight:   700;
      font-family:   ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
      color:         #6b6354;
      cursor:        pointer;
      user-select:   none;
      transition:    background 0.15s, color 0.15s, box-shadow 0.15s, transform 0.15s;
      white-space:   nowrap;
      animation:     sw-pulse 2.2s ease-in-out infinite;
    }
    #sw-panel-btn:hover {
      background:  #f0ebe0;
      color:       #2a2620;
      box-shadow:  0 2px 4px rgba(42,38,32,0.08), 0 10px 28px rgba(42,38,32,0.14);
      transform:   translateY(-1px);
    }
    #sw-panel-btn:active { transform: translateY(0); }
    #sw-panel-btn .sw-btn-icon { font-size: 1rem; line-height: 1; }
  `
  ;(document.head ?? document.documentElement).appendChild(styleEl)
}

// ── Panel-closed overlay ──────────────────────────────────────────────────────
// Covers the whole page when the side panel is closed so seniors can't miss it.

function showOverlay() {
  if (document.getElementById("sw-closed-overlay")) return

  const styleEl = document.createElement("style")
  styleEl.id = "sw-closed-overlay-style"
  styleEl.textContent = `
    #sw-closed-overlay {
      position:        fixed;
      inset:           0;
      z-index:         2147483647;
      background:      rgba(42, 38, 32, 0.6);
      display:         flex;
      align-items:     center;
      justify-content: center;
      padding:         1.5rem;
      font-family:     ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    }
    #sw-closed-overlay-card {
      background:     #f7f1e6;
      border:         1.5px solid #ebe2cf;
      border-radius:  22px;
      box-shadow:     0 10px 48px rgba(42,38,32,0.28);
      padding:        2.5rem 2.25rem;
      width:          100%;
      max-width:      440px;
      display:        flex;
      flex-direction: column;
      align-items:    center;
      gap:            1.25rem;
      text-align:     center;
    }
    #sw-closed-overlay-card h1 {
      font-size:   1.75rem;
      font-weight: 800;
      color:       #2a2620;
      margin:      0;
      line-height: 1.2;
    }
    #sw-closed-overlay-card p {
      font-size:   1.1rem;
      color:       #6b6354;
      margin:      0;
      max-width:   360px;
      line-height: 1.6;
    }
    #sw-closed-overlay-btn {
      font-size:     1.1rem;
      font-weight:   700;
      padding:       0.85rem 2rem;
      background:    #b46428;
      color:         #fff;
      border:        none;
      border-radius: 12px;
      cursor:        pointer;
      font-family:   inherit;
      box-shadow:    0 4px 16px rgba(0,0,0,0.15);
      transition:    opacity 0.15s, transform 0.1s;
      margin-top:    0.25rem;
    }
    #sw-closed-overlay-btn:hover  { opacity: 0.88; }
    #sw-closed-overlay-btn:active { transform: scale(0.97); }
  `
  ;(document.head ?? document.documentElement).appendChild(styleEl)

  const overlay = document.createElement("div")
  overlay.id = "sw-closed-overlay"
  overlay.innerHTML = `
    <div id="sw-closed-overlay-card">
      <span style="font-size:3.5rem;line-height:1">☰</span>
      <h1>Your helper panel is not open</h1>
      <p>Press the button below to open it.</p>
      <button id="sw-closed-overlay-btn">☰ Open Helper Panel</button>
    </div>
  `
  ;(document.body ?? document.documentElement).appendChild(overlay)

  document
    .getElementById("sw-closed-overlay-btn")
    ?.addEventListener("click", () => {
      // Hide immediately (optimistic) — don't rely on storage.onChanged firing
      // cross-context, which is unreliable for session storage in content scripts.
      hideOverlay()
      chrome.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" }).catch(() => {
        // If the message failed, show the overlay again.
        showOverlay()
      })
    })
}

function hideOverlay() {
  document.getElementById("sw-closed-overlay")?.remove()
  document.getElementById("sw-closed-overlay-style")?.remove()
}

// ── Initialise ────────────────────────────────────────────────────────────────

async function init() {
  // Check whether the caregiver has the panel feature enabled.
  // Fail-open: treat as enabled when config is unavailable.
  let panelEnabled = true
  try {
    const config = await storage.local.get("config")
    panelEnabled = config.panelEnabled !== false
  } catch {
    /* fall-open */
  }

  if (!panelEnabled) return

  injectPanelButton()

  // Show overlay immediately if panel is already closed, and keep it in sync
  // whenever the user closes or opens the panel from any surface.
  // Show overlay on init only when panelOpen is explicitly false — meaning the
  // panel was open at some point and then closed. If the key is undefined (panel
  // has never been opened this session), don't show anything; the new-tab gate
  // handles the first-open prompt. PANEL_STATE messages keep it in sync live.
  try {
    const data = await chrome.storage.session.get(["panelOpen"])
    const panelOpen = (data as { panelOpen?: boolean }).panelOpen
    if (panelOpen === false) showOverlay()
  } catch {
    // Unknown state — don't block the page
  }
}

// ── Message handler ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg: unknown, _sender, sendResponse) => {
  if (!msg || typeof msg !== "object" || !("type" in msg)) return

  const raw = msg as { type: string; [k: string]: unknown }

  // Real-time panel state pushed by the service worker via tabs.sendMessage.
  // More reliable than storage.onChanged for cross-context session changes.
  if (raw.type === "PANEL_STATE") {
    if (raw.open) hideOverlay()
    else showOverlay()
    return
  }

  const m = msg as TabCommand
  if (m.type !== "TAB_COMMAND") return

  if (m.payload.command === "scrollTop") {
    window.scrollTo({ top: 0, behavior: "smooth" })
    sendResponse({ ok: true })
    return
  }

  if (m.payload.command === "getScrollPos") {
    const el       = document.documentElement
    const max      = el.scrollHeight - el.clientHeight
    const pct      = max > 0 ? Math.round((el.scrollTop / max) * 100) : 0
    sendResponse({ ok: true, scrollPct: pct })
    return
  }

  if (m.payload.command === "scrollBy") {
    const el       = document.documentElement
    const max      = el.scrollHeight - el.clientHeight
    const step     = Math.max(window.innerHeight * 0.4, 80)
    const target   = Math.max(0, Math.min(el.scrollTop + m.payload.delta * step, max))
    const pct      = max > 0 ? Math.round((target / max) * 100) : 0
    window.scrollBy({ top: m.payload.delta * step, behavior: "smooth" })
    sendResponse({ ok: true, scrollPct: pct })
    return
  }

  if (m.payload.command === "setVolume") {
    const level = Math.min(1, Math.max(0, m.payload.level))
    const media = [
      ...Array.from(document.querySelectorAll<HTMLVideoElement>("video")),
      ...Array.from(document.querySelectorAll<HTMLAudioElement>("audio")),
    ]
    media.forEach((el) => {
      el.volume = level
      el.muted  = level === 0
    })
    sendResponse({ ok: true })
  }
})
