// Shadow DOM mount — injects the side panel into every page.
// Layout detection — column push or floating overlay.

import { h, render } from 'preact'
import { storage } from '@shared/storage'
import { SidePanel } from './SidePanel'

const PANEL_WIDTH = 240

// ── Layout detection ───────────────────────────────────────────────────────
// We want column mode (body push) on as many sites as possible.
// Floating mode is reserved only for true SPA "fixed shells" where pushing
// the body has no effect (e.g. Gmail, YouTube).
//
// We intentionally do NOT fall back to floating for overflow:hidden on html/body
// — that's a common mobile-first pattern and has nothing to do with whether
// body margin injection works.

function detectMode(): 'column' | 'floating' {
  try {
    const body = window.getComputedStyle(document.body)
    // Body itself is fixed — margin cannot shift it.
    if (body.position === 'fixed') return 'floating'
    // If any of the first few body children is a full-viewport fixed overlay
    // (React/Vue SPA root with position:fixed;inset:0), treat as floating.
    for (const child of Array.from(document.body.children).slice(0, 6)) {
      const s = window.getComputedStyle(child as Element)
      if (s.position !== 'fixed') continue
      const r = (child as Element).getBoundingClientRect()
      // Covers ≥ 90 % of the viewport in both dimensions → fixed shell
      if (
        r.width  >= window.innerWidth  * 0.9 &&
        r.height >= window.innerHeight * 0.9
      ) return 'floating'
    }
  } catch {
    return 'floating'
  }
  return 'column'
}

// ── Zoom styles injected into outer document ──────────────────────────────

function injectZoomStyles() {
  const id = 'seniorbrowse-zoom-styles'
  if (document.getElementById(id)) return
  const el = document.createElement('style')
  el.id = id
  // Changing html font-size scales rem-based layouts on the outer page.
  // The panel uses px units and is unaffected (it lives in a separate shadow root).
  el.textContent = `
    html.sw-font-normal { font-size: 16px !important; }
    html.sw-font-large  { font-size: 20px !important; }
    html.sw-font-xlarge { font-size: 24px !important; }
  `
  document.head.appendChild(el)
}

// ── Shadow styles scoped inside the shadow root ───────────────────────────────

const SHADOW_CSS = `
  :host {
    display: block;
    width: 100%;
    height: 100%;

    /* Design tokens — prefixed sw- to avoid outer-page inheritance conflicts */
    --sw-bg:            #f0ebe0;
    --sw-surface:       #faf6ee;
    --sw-surface-edge:  #ddd4be;
    --sw-text:          #2a2620;
    --sw-text-muted:    #6b6354;
    --sw-accent:        #c25e2a;
    --sw-accent-strong: #a04a1c;
    --sw-accent-fg:     #ffffff;
    --sw-radius:        12px;
    --sw-shadow:        0 2px 20px rgba(42,38,32,0.14);

    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    font-size: 16px;
    color: var(--sw-text);
    -webkit-font-smoothing: antialiased;
  }

  *, *::before, *::after { box-sizing: border-box; }

  button {
    font-family: inherit;
    cursor: pointer;
    border: none;
    background: none;
    padding: 0;
    margin: 0;
  }
`

// ── Mount ─────────────────────────────────────────────────────────────────────

export async function mount() {
  // Skip extension-internal pages
  if (
    location.protocol === 'chrome-extension:' ||
    location.protocol === 'chrome:' ||
    location.protocol === 'about:'
  ) return

  // Wait for body (document_end guarantees it, but be safe)
  if (!document.body) return

  const config = await storage.local.get('config')
  const position = config.panelPosition
  const mode = detectMode()

  // ── Create shadow host ────────────────────────────────────────────────────
  const host = document.createElement('div')
  host.id = 'seniorbrowse-host'
  Object.assign(host.style, {
    position: 'fixed',
    top: '0',
    [position]: '0',
    width: `${PANEL_WIDTH}px`,
    height: '100vh',
    zIndex: '2147483647',
    pointerEvents: 'auto',
  })
  document.body.appendChild(host)

  // ── Page push for column mode ─────────────────────────────────────────────
  // Apply padding to the <html> element (not body).
  //
  // Why html and not body?
  //   Nearly every site has "html, body { width: 100%; }" in its CSS reset.
  //   Adding margin-left to body while body has width:100% just overflows by
  //   PANEL_WIDTH pixels — the body is still viewport-wide plus a margin.
  //
  //   Padding on <html> + box-sizing:border-box is different: the html element's
  //   *content box* becomes (viewport − PANEL_WIDTH) wide. Any child that uses
  //   width:100% now gets 100% of that reduced content box, not the full viewport.
  //   This works regardless of what the site sets on body.
  //
  //   Fixed-positioned elements are relative to the viewport (ICB), not the html
  //   content box, so they are unaffected — that's unavoidable without the native
  //   browser sidebar API.
  if (mode === 'column') {
    const pushId = 'seniorbrowse-column-push'
    if (!document.getElementById(pushId)) {
      const paddingProp = position === 'left' ? 'padding-left' : 'padding-right'
      const pushStyle = document.createElement('style')
      pushStyle.id = pushId
      pushStyle.textContent = `
        html {
          ${paddingProp}: ${PANEL_WIDTH}px !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
          transition: ${paddingProp} 0.2s ease !important;
        }
      `
      ;(document.head ?? document.documentElement).appendChild(pushStyle)
    }
  }

  // ── Inject zoom styles ────────────────────────────────────────────────────
  injectZoomStyles()

  // ── Attach shadow root ────────────────────────────────────────────────────
  const shadow = host.attachShadow({ mode: 'open' })

  const styleEl = document.createElement('style')
  styleEl.textContent = SHADOW_CSS
  shadow.appendChild(styleEl)

  // ── Mount Preact panel ────────────────────────────────────────────────────
  const container = document.createElement('div')
  container.style.cssText = 'width:100%;height:100%;'
  shadow.appendChild(container)

  render(h(SidePanel, { position, layoutMode: mode }), container)
}
