# SeniorBrowse — Browser Extension for Seniors

> A Chrome extension that makes the web safe, simple and welcoming for older adults — while giving caregivers the tools to configure and monitor it invisibly.

---

## What it does

SeniorBrowse replaces Chrome's new tab page with a clean, high-contrast home screen and adds a persistent helper panel on every page. The senior gets a calm, easy-to-use browsing experience. The caregiver configures everything behind a PIN — the senior never sees settings, warnings about trials, or anything technical.

**Two users. One extension.**

| Senior | Caregiver |
|---|---|
| Personalized greeting | PIN-protected settings |
| Big shortcut tiles | Add / remove / reorder shortcuts |
| Helper panel on every page | Configure security & safety rules |
| Guided spotlight tour | Monitor saved pages & activity |
| Light / dark mode | Manage trial & subscription status |

---

## Features

### 🏠 New Tab Home Screen

- **Personalized greeting** — "Good morning, Halina!" with real-time clock
- **Large search bar** — one-click Google search, no typing of URLs needed
- **Shortcut tiles** — favourite websites as big, tappable tiles with icons
  - 5 size options (small → xl2), drag-to-reorder in admin mode
  - Automatic favicons with letter-avatar fallback
  - Undo toast on delete (5-second window)
- **Recent sites** — last 3 visited pages, deduped by domain
- **Font-size recovery** — if the senior enlarged text last session, a gentle prompt asks whether to keep it

### 🗂️ Helper Side Panel

Always visible on every page via the Chrome side panel. Every button has a text label — no icon-only controls.

| Button | What it does |
|---|---|
| **Home** | Returns to the new tab home screen |
| **Back / Forward** | Browser navigation |
| **Volume** | 10-segment equaliser bar, Less / More / Mute |
| **Move Page** | Scroll up, down, or jump to top with a progress bar |
| **Text Size** | Cycles through Normal → Large → X-Large zoom levels |
| **Save this page** | Bookmarks the current page for the caregiver to review |
| **Close Page** | Closes the current tab |

The caregiver can reorder, rename or hide any button from within admin mode.

### 🔒 Caregiver Admin Mode

Unlocked from the new tab page with a 4-digit PIN (default `1234`).

- **Settings modal** with five tabs:
  - **Profile** — senior's name, caregiver's name
  - **Security** — downloads, ads, suspicious link behaviour, whitelist & blacklist
  - **Saved pages** — all pages the senior bookmarked
  - **Activity log** — full visit, search and save history (up to 1,000 entries)
  - **Trial status** — usage stats and subscription countdown
- **Edit mode banner** — orange bar signals that changes are in progress
- **Shortcut editor** — drag, resize, add or remove tiles live
- **Panel editor** — reorder, relabel or hide any side panel button
- **Restart tour** — re-run the guided spotlight tour for the senior at any time

Admin mode is shared across the new tab page and the side panel — enter the PIN once, both surfaces unlock simultaneously.

### 🛡️ Security & Safety

All protection is silent and automatic — the senior never needs to do anything.

| Feature | Details |
|---|---|
| **Suspicious link protection** | Google Safe Browsing API — malware is hard-blocked, social engineering shows a bypass page |
| **Download blocking** | Cancels any file download before it starts |
| **Ad & popup blocking** | Declarative network rules, toggled per-config |
| **Whitelist** | Specific domains bypass all safety checks |
| **Blacklist** | Specific domains redirect to a friendly blocked page |
| **Activity logging** | Every visit, search and save is recorded for the caregiver |

### 🎓 Onboarding & Tours

**Phase 1 — Caregiver setup wizard** (first launch)
1. Welcome + explanation
2. Enter senior & caregiver names
3. Add favourite websites (quick-add suggestions with icons, or custom URLs)
4. Configure safety settings
5. Handover ritual — warm messaging to transition the computer to the senior

**Phase 2 — Senior walkthrough** (after setup completes)
Spotlight tour that highlights each part of the home screen in sequence — greeting, search bar, shortcut tiles — with a guided tooltip card and progress dots.

**Phase 3 — Panel spotlight tour** (triggered after the walkthrough)
A second spotlight tour walks the senior through every panel button with animated highlights and friendly explanations.

All tours can be restarted by the caregiver at any time from Settings or the panel admin banner.

### 🌗 Light & Dark Mode

Full theme support across both surfaces. Toggle sits bottom-left on the home screen. Theme preference is saved and synced across all extension pages instantly.

### ⏳ Trial System

30-day free trial with a 3-day grace period. The caregiver sees a countdown and usage stats; the senior never sees trial language, payment mentions or license information. On expiry, a neutral screen appears: *"SeniorBrowse needs attention — please ask [Caregiver] to take a look."*

---

## Tech Stack

| Layer | Technology |
|---|---|
| New tab & settings UI | React 18 + TypeScript |
| Side panel | React 18 + TypeScript |
| Background logic | Vanilla ES module service worker |
| Build tool | Vite (multi-entry) |
| Drag & drop | SortableJS |
| Icons | Phosphor Icons (`@phosphor-icons/react`) |
| Storage | `chrome.storage.local` + `chrome.storage.session` |
| Browser target | Chrome MV3 |

---

## Project Structure

```
src/
├── background/          # Service worker — routing, safe browsing, trial logic
├── content/             # Content script — scroll/volume control, panel bridge
├── newtab/              # New tab React app
│   ├── components/      # WelcomeBanner, ShortcutGrid, SearchBar, SettingsModal…
│   └── hooks/           # useAdminMode, useFontSize, useTheme
├── sidepanel/           # Side panel React app
│   └── App.tsx          # Tile grid, volume/scroll controls, tour wizard
└── shared/              # Storage wrapper, TypeScript types, constants
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Chrome 114+ (for side panel API support)

### Install & build

```bash
npm install
npm run build
```

The compiled extension lands in `dist/`.

### Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `dist/` folder

Open a new tab — the SeniorBrowse home screen appears immediately.

### Development

```bash
npm run dev
```

Hot-module reload works for the new tab page. After changes to the service worker or content script, rebuild and reload the extension in `chrome://extensions`.

### Environment variables

Create a `.env` file in the project root:

```env
VITE_SAFE_BROWSING_KEY=your_google_safe_browsing_api_key
```

Without this key the extension falls back to allowing all URLs (no safe browsing checks).

---

## Keyboard Shortcut

| Shortcut | Action |
|---|---|
| `Alt + Shift + P` | Open / close the side panel |

---

## Configuration Reference

All settings live in `chrome.storage.local` under the `config` key. Default values:

```json
{
  "caregiverName": "",
  "seniorName": "",
  "panelPosition": "right",
  "defaultFontSize": "normal",
  "adminPin": "1234",
  "panelEnabled": true,
  "theme": "light",
  "security": {
    "blockDownloads": true,
    "blockSuspiciousLinks": "warn",
    "blockAds": true,
    "whitelist": [],
    "blacklist": []
  },
  "panelButtonOrder": ["home","back","forward","volume","scroll","zoom","save","exit"],
  "panelButtons": {
    "home":    { "label": "HOME",           "visible": true },
    "back":    { "label": "BACK",           "visible": true },
    "forward": { "label": "FORWARD",        "visible": true },
    "volume":  { "label": "VOLUME",         "visible": true },
    "scroll":  { "label": "MOVE PAGE",      "visible": true },
    "zoom":    { "label": "TEXT SIZE",      "visible": true },
    "save":    { "label": "SAVE THIS PAGE", "visible": true },
    "exit":    { "label": "CLOSE PAGE",     "visible": true }
  }
}
```

---

## Design Principles

1. **Senior-first** — every word of UI copy is tested for clarity. No jargon, no technical terms.
2. **Invisible security** — protection is always on; the senior never needs to act on a security decision.
3. **High contrast** — all text meets or exceeds WCAG AA contrast ratios. Muted text targets ~10:1 on background.
4. **Every control is labelled** — icons are always accompanied by a text label.
5. **Caregiver transparency** — caregivers see everything; seniors see only what's relevant to browsing.
6. **No surprise vocabulary** — words like "subscription", "trial", "payment", "expired" never appear in the senior-facing UI.

---

## License

MIT
