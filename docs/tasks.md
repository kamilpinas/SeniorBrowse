# SeniorBrowse MVP — Task List

**Architecture:** SeniorBrowse Chrome Extension (Manifest V3)
**Phase:** MVP — Phase 1
**Total tasks:** 42

---

## Project Setup

### S-01 — Scaffold multi-entry Vite project
**Time:** 2h
**Description:** Create the monorepo with Vite configured for four entry points: newtab, admin, content, background.
**Inputs:**
- vite.config.js template
- package.json with dependencies (React, Preact, SortableJS)

**Expected outputs:**
- Working build: vite build produces four separate bundles
- Hot-reload works for newtab and admin entries

---

### S-02 — Write manifest.json with all permissions
**Time:** 1h
**Description:** Author the Manifest V3 manifest with all required permissions, host_permissions, background, content_scripts, and chrome_url_overrides.
**Inputs:**
- Permission list from architecture doc
- Project structure

**Expected outputs:**
- manifest.json accepted by chrome://extensions without errors
- Extension loads in unpacked mode

---

### S-03 — Create chrome.storage wrapper (storage.js)
**Time:** 1h
**Description:** Write a thin typed wrapper around chrome.storage.local and chrome.storage.session with get/set/update helpers.
**Inputs:**
- Data model from architecture doc
- types.js skeleton

**Expected outputs:**
- storage.js with get(), set(), update() for local and session
- Used by at least one other module without direct chrome.storage calls

---

### S-04 — Define constants.js and types.js
**Time:** 1h
**Description:** Define all shared enums, default config values, and JSDoc types used across components.
**Inputs:**
- Data model from architecture doc

**Expected outputs:**
- constants.js with DEFAULT_CONFIG, MAX_LOG_ENTRIES=1000, font size values
- types.js with JSDoc for Config, Shortcut, SavedLink, ActivityLog entry

---

## New Tab

### N-01 — New tab page shell + no-flash loading
**Time:** 1h
**Description:** Create the newtab HTML entry. Set background-color on `<html>` before React mounts to eliminate the white flash.
**Inputs:**
- newtab/index.html
- Vite entry config

**Expected outputs:**
- Page loads with correct background before React hydrates
- No white flash visible on open

---

### N-02 — WelcomeBanner component
**Time:** 1h
**Description:** Render personalized greeting ("Good morning, Halina!") driven by seniorName from storage and current time of day.
**Inputs:**
- storage.js
- config.seniorName

**Expected outputs:**
- Greeting changes based on time (morning / afternoon / evening)
- Falls back to generic greeting if name not set

---

### N-03 — Clock display component
**Time:** 1h
**Description:** Show current time and date, updating every second. Large font, readable by 50–80+ users.
**Inputs:**
- UX constraints (min 16px font)

**Expected outputs:**
- Live clock updating every second
- Font size ≥ 32px, high contrast

---

### N-04 — Google SearchBar component
**Time:** 1h
**Description:** Render a large, prominent search bar that submits to https://google.com/search?q=...
**Inputs:**
- UX constraints

**Expected outputs:**
- Search bar with min height 48px, visible label
- Enter key and submit button both work

---

### N-05 — ShortcutGrid component (display only)
**Time:** 2h
**Description:** Render shortcuts from storage as large icon + text label tiles. No editing yet — display and click-to-navigate only.
**Inputs:**
- storage.js
- shortcuts[] data model

**Expected outputs:**
- Grid renders from chrome.storage.local shortcuts
- Clicking a tile navigates to the URL
- Icon falls back to letter avatar if iconUrl missing

---

### N-06 — Font size application on new tab
**Time:** 1h
**Description:** On page mount, read currentFontSize from session storage and apply a CSS class to the root element. Show recovery prompt if font changed since last session.
**Inputs:**
- storage.js
- session: currentFontSize, previousFontSize
- local: config.defaultFontSize

**Expected outputs:**
- Font class applied before first paint
- Recovery prompt shown when previous ≠ default

---

## Side Panel

### P-01 — Shadow DOM mount (shadowMount.js)
**Time:** 2h
**Description:** Inject the side panel into every page inside a Shadow DOM host element. Prevent external page styles from leaking in.
**Inputs:**
- content/index.js
- shadowMount.js skeleton

**Expected outputs:**
- Panel renders inside shadow root
- Verified: no external CSS affects panel on a complex page (e.g. Wikipedia)

---

### P-02 — Fixed column layout + overflow detection
**Time:** 2h
**Description:** Inject panel as a fixed left or right column that pushes body content. Detect overflow:hidden and fixed layouts; fall back to floating overlay.
**Inputs:**
- config.panelPosition
- Layout detection logic from architecture doc

**Expected outputs:**
- Panel pushes body on standard pages
- Floating overlay on pages with overflow:hidden
- No content hidden behind the panel

---

### P-03 — Side panel button set
**Time:** 2h
**Description:** Render all panel buttons: Back, Forward, Home, Zoom text, Scroll to top, Save link, Exit. Every button has an icon AND text label.
**Inputs:**
- UX constraints (never icon-only)
- Button list from architecture doc

**Expected outputs:**
- All 7 buttons visible with labels
- Home button is visually distinct (larger or different color)
- Back/Forward use window.history
- Scroll to top scrolls to 0
- Exit closes the tab

---

### P-04 — Zoom text button with state display
**Time:** 1h
**Description:** Cycle through normal → large → xlarge font sizes. Always show current state on the button label ("Text: large").
**Inputs:**
- session: currentFontSize
- content script font size application

**Expected outputs:**
- Button label always reflects active size
- Font size class applied to page body
- State written to chrome.storage.session

---

### P-05 — Save link button + confirmation message
**Time:** 1h
**Description:** On click: save current tab URL + title to savedLinks in local storage. Show confirmation: "Saved! [CaregiverName] will see this in their panel."
**Inputs:**
- storage.js
- config.caregiverName
- chrome.tabs API for current URL/title

**Expected outputs:**
- Link appears in savedLinks after click
- Confirmation message uses caregiver name
- Duplicate saves are handled (update savedAt)

---

## Background

### B-01 — Service worker bootstrap + message routing
**Time:** 1h
**Description:** Set up the service worker entry point with chrome.runtime.onMessage listener routing to handler modules.
**Inputs:**
- background/service-worker.js skeleton

**Expected outputs:**
- Service worker registers without error
- Messages route to correct handler stubs

---

### B-02 — Google Safe Browsing integration (safetyCheck.js)
**Time:** 3h
**Description:** On chrome.webNavigation.onBeforeNavigate, check URL against Safe Browsing API v4. Block or warn based on config.security.blockSuspiciousLinks setting. Cache recent results in session storage.
**Inputs:**
- Google Safe Browsing API key
- config.security.blockSuspiciousLinks
- Session cache for recent checks

**Expected outputs:**
- Blocked URLs show a neutral block page
- Warn mode shows a confirm dialog before continuing
- Results cached in session to stay under 10k req/day limit

---

### B-03 — Download blocker (downloadBlocker.js)
**Time:** 1h
**Description:** Listen on chrome.downloads.onDeterminingFilename. Cancel download if config.security.blockDownloads is true.
**Inputs:**
- config.security.blockDownloads

**Expected outputs:**
- Download cancelled when setting is on
- Download proceeds normally when setting is off

---

### B-04 — Activity logger (activityLogger.js)
**Time:** 1h
**Description:** Log page visits, searches, and saved links to activityLog in local storage. Rotate: drop oldest when count exceeds 1000.
**Inputs:**
- chrome.tabs.onUpdated, chrome.webNavigation events
- storage.js

**Expected outputs:**
- Log entries created for visit, search, save types
- Log never exceeds 1000 entries
- Each entry has url, title, visitedAt, type

---

### B-05 — Trial manager (trialManager.js)
**Time:** 2h
**Description:** On browser start, read subscription from storage. Compute status (trial / grace / expired) from installedAt and graceEndsAt. Set status. If expired, send message to newtab to show neutral shutdown screen.
**Inputs:**
- storage.js subscription object
- Trial flow from architecture doc

**Expected outputs:**
- Status computed correctly for all three states
- Expired status triggers neutral senior message
- Admin sees 7-day warning at day 23

---

### B-06 — Whitelist / blacklist navigation filter
**Time:** 1h
**Description:** In webNavigation handler, check URL hostname against config.security.whitelist and blacklist before Safe Browsing API call. Whitelist = always allow, blacklist = always block.
**Inputs:**
- config.security.whitelist / blacklist
- safetyCheck.js

**Expected outputs:**
- Whitelisted domains bypass Safe Browsing check
- Blacklisted domains blocked immediately
- Other URLs proceed to safetyCheck.js

---

### B-07 — Ad and popup blocking (declarativeNetRequest rules)
**Time:** 2h
**Description:** Generate or bundle declarativeNetRequest rules for ad blocking. Enable/disable rule set based on config.security.blockAds.
**Inputs:**
- config.security.blockAds
- DNR rule set (use EasyList subset or pre-bundled rules)

**Expected outputs:**
- Ads blocked on common sites when setting is on
- Rule set disabled when setting is off
- No impact on page load when disabled

---

## Admin Mode

### A-01 — Admin mode toggle via toolbar button
**Time:** 1h
**Description:** Clicking the extension toolbar icon sets adminModeActive in session storage and sends a message to newtab and content script to enter edit mode.
**Inputs:**
- chrome.action.onClicked
- session: adminModeActive

**Expected outputs:**
- Admin mode activates on toolbar click
- Deactivates on second click
- Both newtab and side panel receive the mode change message

---

### A-02 — Edit mode banner
**Time:** 1h
**Description:** When adminModeActive is true, show a persistent "Edit mode" banner across the top of newtab and the side panel.
**Inputs:**
- session: adminModeActive

**Expected outputs:**
- Banner appears in both newtab and panel simultaneously
- Banner disappears when admin mode is off

---

### A-03 — Shortcut drag-and-drop + reorder (AdminOverlay.jsx)
**Time:** 3h
**Description:** In admin mode, wrap ShortcutGrid with SortableJS drag handles. On reorder, update positions in storage.
**Inputs:**
- SortableJS
- storage.js shortcuts[]
- AdminOverlay.jsx

**Expected outputs:**
- Shortcuts are draggable in admin mode only
- Order persists to storage and survives page reload
- Normal mode: no drag UI visible

---

### A-04 — Shortcut resize handles
**Time:** 2h
**Description:** In admin mode, each shortcut tile gets resize handles (small/medium/large). Size updates written to storage.
**Inputs:**
- shortcuts[].size field
- storage.js

**Expected outputs:**
- Three size options selectable per shortcut
- Size persists after reload
- Resizing one tile does not move others unexpectedly

---

### A-05 — Add shortcut flow
**Time:** 2h
**Description:** In admin mode, show an "Add shortcut" tile. Clicking opens a small form: URL input, label input, confirm. Favicon fetched automatically from URL.
**Inputs:**
- storage.js shortcuts[]
- Favicon fetch: https://www.google.com/s2/favicons?domain=...

**Expected outputs:**
- New shortcut appears in grid after confirm
- Favicon auto-populated
- Label defaults to page hostname if left blank

---

### A-06 — Delete shortcut with confirm + undo toast
**Time:** 1h
**Description:** In admin mode, each shortcut shows a delete button. Clicking shows a confirm dialog. After confirm, show a 5-second undo toast. On undo: restore shortcut.
**Inputs:**
- storage.js shortcuts[]
- UX constraints: confirm before delete, 5s undo toast

**Expected outputs:**
- Delete requires two actions (confirm click)
- Undo toast appears for 5 seconds
- Undo restores shortcut in original position

---

### A-07 — Side panel button reorder in admin mode
**Time:** 2h
**Description:** In admin mode, panel buttons become draggable via SortableJS. Order saved to storage.
**Inputs:**
- SortableJS
- storage.js panelButtonOrder (new field)

**Expected outputs:**
- Buttons reorderable in admin mode
- Order persists
- Home button remains visually distinct regardless of position

---

### A-08 — Side panel button label edit + visibility toggle
**Time:** 1h
**Description:** In admin mode, each panel button gets an inline text input for label editing and a visibility toggle. Changes saved to storage.
**Inputs:**
- storage.js panelButtons config (new field)

**Expected outputs:**
- Label changes reflected immediately on button
- Hidden buttons disappear from senior view
- At least one button always visible (guard)

---

## Settings Modal

### M-01 — SettingsModal shell + tabs
**Time:** 1h
**Description:** Create the SettingsModal component with tab navigation: Profile, Security, Saved Links, Activity Log, Trial.
**Inputs:**
- admin/components/SettingsModal.jsx

**Expected outputs:**
- Modal opens from admin toolbar
- Five tabs render correct content areas
- Modal closes without losing state

---

### M-02 — Profile settings tab
**Time:** 1h
**Description:** Form for seniorName and caregiverName. Changes saved to config in storage on blur or save.
**Inputs:**
- storage.js config

**Expected outputs:**
- Name changes propagate to greeting and panel messages without page reload

---

### M-03 — Security settings tab
**Time:** 2h
**Description:** UI for: blockDownloads toggle, blockSuspiciousLinks radio (block/warn/off), blockAds toggle, whitelist textarea, blacklist textarea.
**Inputs:**
- storage.js config.security

**Expected outputs:**
- All settings read from and written to storage
- Changes take effect on next navigation (background picks them up)

---

### M-04 — Saved links panel (SavedLinksPanel.jsx)
**Time:** 2h
**Description:** Display savedLinks as a visual gallery: thumbnail (or placeholder) + title + date. Allow caregiver to delete individual links.
**Inputs:**
- storage.js savedLinks[]
- html2canvas (optional, for thumbnails)

**Expected outputs:**
- Gallery renders all saved links
- Delete removes from storage
- Placeholder shown when thumbnail is absent

---

### M-05 — Activity log tab (ActivityLog.jsx)
**Time:** 1h
**Description:** Render activityLog entries as a scrollable list: type icon, title, URL, timestamp. Newest first.
**Inputs:**
- storage.js activityLog[]

**Expected outputs:**
- Log renders up to 1000 entries without freezing (virtualization or pagination)
- Each entry shows type, title, time

---

### M-06 — Trial status tab (TrialBanner.jsx)
**Time:** 1h
**Description:** Show trial status, days remaining, and usage count. Show payment CTA (placeholder for Phase 2). Never expose this tab to the senior.
**Inputs:**
- storage.js subscription
- activityLog (for usage count)

**Expected outputs:**
- Correct status shown for trial / grace / expired states
- Days remaining calculated accurately
- Tab only reachable via admin mode

---

## Onboarding

### O-01 — Caregiver wizard (phase 1)
**Time:** 3h
**Description:** Multi-step wizard that opens automatically on first install. Steps: welcome, add shortcuts, configure security, name the senior. Ends with a success screen and handover instruction.
**Inputs:**
- OnboardingWizard.jsx
- storage.js
- First-install detection via config.onboardingDone flag

**Expected outputs:**
- Wizard opens only on first install
- All wizard steps write to storage
- Ends with: "Now ask Halina to sit down with you."

---

### O-02 — Senior wizard (phase 3)
**Time:** 2h
**Description:** Short guided walkthrough for the senior, with caregiver present. Three steps: home button, search, save a link. Friendly language, no jargon.
**Inputs:**
- OnboardingWizard.jsx phase 3 mode
- config.seniorName, config.caregiverName

**Expected outputs:**
- Wizard opens when caregiver clicks "Start senior walkthrough"
- Uses senior's name throughout
- No technical words in any visible text

---

## UX Polish

### U-01 — Font size + contrast audit
**Time:** 1h
**Description:** Audit all senior-facing UI for min 16px font size and WCAG AA color contrast. Fix violations.
**Inputs:**
- All senior-facing components
- WCAG contrast checker

**Expected outputs:**
- No font below 16px in senior UI
- All text passes 4.5:1 contrast ratio

---

### U-02 — Senior-facing copy audit
**Time:** 1h
**Description:** Scan all strings rendered to the senior. Remove: "subscription", "trial", "payment", "expired", "license", and any technical jargon.
**Inputs:**
- All senior-facing component strings

**Expected outputs:**
- No forbidden words appear in senior UI
- Expired state shows only: "Something went wrong. Tell [CaregiverName] to check the computer."
