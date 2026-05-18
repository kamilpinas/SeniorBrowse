# SeniorBrowse — System Architecture

**Date:** 2026-05-01
**Status:** MVP — Phase 1
**Type:** Chrome Browser Extension (Manifest V3)
**Solo Developer**

---

## Product Overview

SeniorBrowse is a Chrome extension with two distinct users:

- **Senior (end-user):** 50–80+, fears clicking the wrong thing, wants to browse safely and independently
- **Caregiver (buyer/decision-maker):** Family member or medical caregiver who installs, configures, and monitors

The extension replaces the browser's default new tab, injects a permanent side panel on every page, and provides an admin mode for the caregiver to configure everything visually — in place, without a separate admin dashboard.

---

## Scope — MVP (Phase 1)

### In scope
- Custom new tab page (senior UI)
- Persistent side panel (always visible, every page)
- Admin mode (in-place editing of shortcuts and side panel)
- Admin settings modal (security, profile, trial status)
- Local activity log (visible only to caregiver)
- Saved links panel (senior saves → caregiver sees)
- Basic security filtering (Google Safe Browsing API)
- Trial system (local, 30 days + 3-day grace period)
- Onboarding wizard (caregiver → handover ritual → senior)
- Chrome only

### Out of scope (Phase 2+)
- Backend / cloud sync
- Subscription billing (Stripe + Supabase)
- Caregiver remote access / notifications
- Multi-device support
- Firefox / Edge support
- Mobile

---

## High-Level Architecture

```
Chrome Extension (all logic runs locally)
│
├── /newtab          → React   — Senior home page
├── /admin           → React   — Settings modal + admin mode overlay
├── /content         → Preact  — Side panel (injected on every page)
├── /background      → Vanilla — Service Worker (core logic)
└── /shared
      storage.js     → chrome.storage wrapper (local + session)
      constants.js
      types.js
```

No backend in MVP. Zero network requests except Google Safe Browsing API.

---

## Component Details

### 1. New Tab Page (`/newtab`) — React

Replaces Chrome's default new tab. This is the senior's "home."

**Responsibilities:**
- Personalized greeting: `"Good morning, Halina! What would you like to do?"`
- Shortcut grid (large icons + text labels, configurable by caregiver)
- Google search bar (large, prominent)
- Clock display
- Smooth loading screen (no white flash between Chrome and SeniorBrowse)

**Admin mode overlay (injected from `/admin`):**
- Shortcuts get resize handles + drag handles (SortableJS)
- Visual "Edit mode" border indicator
- Changes auto-save to `chrome.storage.local` and are immediately visible to senior

---

### 2. Side Panel (`/content`) — Preact

Injected as a content script on every page. This is the senior's "lifeline."

**Always visible. Cannot be covered by external pages.**

**Rendering strategy:**
```
Try: inject as fixed column → push body content (margin-left/right)
     └── detect if page has overflow:hidden or fixed layout
         └── fallback: floating overlay (opacity 0.95, shadow DOM)
```

**Isolation:** Rendered inside Shadow DOM to prevent external page styles from breaking the panel UI.

**Buttons (all with text labels, never icon-only):**
- Back
- Forward
- Home (visually distinct — larger or different color — primary escape button)
- Zoom text (shows current state always: "Text: normal / large / x-large")
- Scroll to top
- Save link
- Exit (close tab/browser)

**Save link behavior:**
After saving, show: `"Saved! Marek will see this recipe in his panel."` — connects senior to caregiver emotionally.

**Admin mode:**
- Panel buttons become reorderable (drag-and-drop)
- Each button gets inline edit (label, visibility toggle)

---

### 3. Admin Mode + Settings Modal (`/admin`) — React

**Admin mode is NOT a separate page.** It is activated via a toolbar button (key icon in Chrome extension bar). When active:

- New Tab page: shortcuts become draggable + resizable
- Side panel: buttons become reorderable + editable
- Subtle "Edit mode" banner visible across both
- All changes save instantly to `chrome.storage.local`

**Settings modal** (separate from in-place editing — for things with no visual representation):
- Senior profile: name (used in all messages), caregiver name
- Security settings: block downloads (on/off), suspicious links (block/warn/off), block ads & popups (on/off), whitelist, blacklist
- UI toggles: show/hide browser history, browser settings access
- Saved links panel (visual gallery: thumbnail + title + date)
- Activity log (local only, visible to caregiver only)
- Trial status + trial end warning

**Confirmation patterns:**
- Confirm before deleting any shortcut
- Undo toast (Gmail pattern) — 5 seconds after any destructive action

---

### 4. Background Service Worker (`/background`) — Vanilla JS

The brain. Reacts to browser events.

**Responsibilities:**
- Intercept navigation → check URL against Google Safe Browsing API
- Block downloads if caregiver setting is enabled
- Log activity locally (visits, searches, saves) with rotation (max 1000 entries)
- Manage session state (reset font size on new session)
- Check trial expiry on browser start
- Handle admin mode toggle state

---

## Data Model

All data stored in `chrome.storage.local` or `chrome.storage.session`. Nothing leaves the device in MVP.

### `chrome.storage.local` (persistent)

```javascript
{
  // Caregiver + senior profile
  "config": {
    "caregiverName": "Marek",
    "seniorName": "Halina",
    "panelPosition": "left",            // "left" | "right"
    "defaultFontSize": "normal",        // "normal" | "large" | "xlarge"
    "security": {
      "blockDownloads": true,
      "blockSuspiciousLinks": "warn",   // "block" | "warn" | "off"
      "blockAds": true,
      "whitelist": ["onet.pl", "youtube.com"],
      "blacklist": []
    },
    "ui": {
      "showHistory": false,
      "showBrowserSettings": false
    }
  },

  // Shortcut grid on new tab
  "shortcuts": [
    {
      "id": "uuid",
      "label": "Movies",               // caregiver-configurable label
      "url": "https://youtube.com",
      "iconUrl": "https://...",        // favicon or base64
      "position": 0,                   // sort order
      "size": "medium"                 // "small" | "medium" | "large"
    }
  ],

  // Links saved by senior
  "savedLinks": [
    {
      "id": "uuid",
      "url": "https://...",
      "title": "Old Polish Bigos",
      "thumbnail": "base64",           // optional, from html2canvas
      "savedAt": "ISO timestamp"
    }
  ],

  // Silent local activity log (caregiver-only view)
  "activityLog": [
    {
      "url": "https://...",
      "title": "Page title",
      "visitedAt": "ISO timestamp",
      "type": "visit"                  // "visit" | "search" | "save"
    }
    // max 1000 entries, rotate oldest
  ],

  // Trial (local in MVP, replaced by Supabase in Phase 2)
  "subscription": {
    "status": "trial",                 // "trial" | "grace" | "expired"
    "installedAt": "ISO timestamp",
    "graceEndsAt": "ISO timestamp"     // installedAt + 33 days
  }
}
```

### `chrome.storage.session` (resets on browser close)

```javascript
{
  "currentFontSize": "normal",         // active this session
  "previousFontSize": null,            // if changed last session → show recovery prompt
  "adminModeActive": false
}
```

**Key behavioral rule:** On every browser open, `currentFontSize` is reset to `config.defaultFontSize`. If `previousFontSize !== config.defaultFontSize`, show prompt: `"Halina, last time the text was enlarged. Keep it that way or go back to normal?"`

---

## Trial Flow

```
Install
  └── installedAt = now()
      graceEndsAt = now() + 33 days (30 trial + 3 grace)
      status = "trial"

Day 23 → Admin settings modal shows: "7 days left. Halina used SeniorBrowse 20 of the last 23 days."

Day 30 → status = "grace"
          Senior continues normally
          Admin sees payment banner (senior never sees it)

Day 33 → status = "expired"
          Extension shuts down completely
          Senior sees neutral screen: "Something went wrong. Tell Marek to check the computer."
          Senior NEVER sees the words "subscription", "payment", or "trial"

Payment → Phase 2 (Stripe + Supabase)
```

---

## Onboarding Flow (3-phase ritual)

```
Phase 1 — Caregiver Wizard
  └── Opens automatically on first install
  └── Step by step: add shortcuts, configure security, name senior
  └── Ends with: success screen + clear next instruction

Phase 2 — Handover Ritual
  └── "Great! Now ask Halina to sit down with you."
  └── Emotional framing: caregiver is handing a gift, not installing software

Phase 3 — Senior Wizard
  └── Caregiver present but senior drives
  └── Opens with: "Nothing is broken, Halina. This is a special program Marek set up for you."
  └── Short walkthrough: home button, search, save link
```

---

## Security Model

| Feature | Implementation |
|---|---|
| Suspicious link blocking | Google Safe Browsing API v4 (free up to 10k req/day) |
| Download blocking | `chrome.downloads.onDeterminingFilename` intercept |
| Ad & popup blocking | `chrome.webRequest` declarativeNetRequest rules |
| Whitelist / blacklist | Checked in background service worker before navigation |
| Caregiver lock | Admin mode requires extension toolbar click — not accessible from senior UI |

**Design rule:** Security is on by default. Senior never needs to "enable" safety — it is invisible and always active.

---

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| New Tab + Admin | React + Vite | Developer familiarity, fast iteration |
| Content Script (side panel) | Preact | Identical React API, ~3KB runtime vs ~40KB — matters on every page load |
| Background Service Worker | Vanilla JS | No framework needed, keep it minimal |
| Drag-and-drop | SortableJS | Lightweight, battle-tested |
| Storage | chrome.storage.local + .session | Built-in, no dependencies |
| Safe Browsing | Google Safe Browsing API v4 | Don't build your own |
| Thumbnails | html2canvas (lazy, optional) | For saved links gallery |
| Style isolation | Shadow DOM | Prevents external pages from breaking side panel |

---

## Project Structure

```
/seniorbrowse
  /src
    /newtab
      index.html
      main.jsx
      App.jsx
      components/
        ShortcutGrid.jsx
        SearchBar.jsx
        WelcomeBanner.jsx
        AdminOverlay.jsx        ← admin mode drag/resize layer
    /admin
      index.html
      main.jsx
      App.jsx
      components/
        SettingsModal.jsx
        SavedLinksPanel.jsx
        ActivityLog.jsx
        TrialBanner.jsx
        OnboardingWizard.jsx
    /content
      index.js                  ← injects side panel
      SidePanel.jsx             ← Preact component
      shadowMount.js            ← Shadow DOM setup
    /background
      service-worker.js
      safetyCheck.js            ← Google Safe Browsing integration
      downloadBlocker.js
      activityLogger.js
      trialManager.js
    /shared
      storage.js                ← unified chrome.storage wrapper
      constants.js
      types.js
  /public
    manifest.json
    icons/
  vite.config.js                ← multi-entry build (newtab, admin, content, background)
  package.json
```

---

## Manifest V3 Key Permissions

```json
{
  "manifest_version": 3,
  "permissions": [
    "storage",
    "tabs",
    "activeTab",
    "downloads",
    "declarativeNetRequest",
    "scripting"
  ],
  "host_permissions": ["<all_urls>"],
  "chrome_url_overrides": { "newtab": "newtab/index.html" },
  "background": { "service_worker": "background/service-worker.js" },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/index.js"],
      "css": ["content/panel.css"],
      "run_at": "document_end"
    }
  ],
  "action": { "default_popup": "admin/index.html" }
}
```

**Note for Chrome Web Store review:** Each permission must have a plain-language justification in the store listing. `<all_urls>` is required for the side panel to appear on every page the senior visits.

---

## UX Constraints (Non-negotiable)

These are product requirements that affect implementation decisions:

- **Min font size: 16px** everywhere in senior UI
- **High color contrast** — WCAG AA minimum
- **Every icon must have a text label** — never icon-only
- **Home button must be visually distinct** from other side panel buttons (larger or different color)
- **No white flash** on new tab load — use background-color in HTML before React mounts
- **All settings are per-session** — accidental changes by senior revert on next open
- **Confirm before delete** on all caregiver destructive actions
- **Undo toast (5s)** after every destructive action in admin mode
- **Senior never sees:** "subscription", "trial", "payment", "expired", "license"
- **No jargon** in any senior-facing text

---

## Known Technical Risks

| Risk | Severity | Mitigation |
|---|---|---|
| External pages breaking fixed column layout | High | Auto-detect `overflow:hidden` → fallback to floating overlay |
| Chrome Web Store rejection due to `<all_urls>` | Medium | Document each permission in store listing clearly |
| Stripe/Supabase CSP issues (Phase 2) | Medium | Pre-add domains to `content_security_policy` in manifest |
| `chrome.storage.local` 10MB limit | Low | Activity log rotation — max 1000 entries, drop oldest |
| Google Safe Browsing API rate limit (10k/day) | Low | Cache recent checks in session storage |

---

## Phase 2 Preview (do not implement now)

When Phase 2 begins, these are the only integration points:

- Replace `trialManager.js` local logic with Supabase token validation
- Add `auth.js` in `/shared` for Supabase Auth (email-based caregiver account)
- Add Stripe billing via Supabase Edge Functions
- `chrome.storage.sync` for cross-device config (optional)
- Push notifications for caregiver (activity alerts, new saved links)

Everything else stays the same. Backend touches only auth and subscription — never senior UI.

---

## Key Product Decisions (for context)

| Decision | Reason |
|---|---|
| Admin mode is in-place, not a separate page | Caregiver edits what they see — WYSIWYG |
| Senior name in every system message | Turns technical messages into personal ones — highest emotional impact |
| 3-day grace period after trial ends | Senior must not wake up to a broken browser — catastrophic first impression |
| Senior never sees payment info | Older people stop using things they feel are a cost burden to family |
| Security on by default, invisible | Senior should never have to "enable" safety |
| Save link = communication channel | Senior can't send email — but can click Save. Replaces async communication with caregiver |
| Local-only data in MVP | Privacy first, no compliance overhead, faster to ship |
