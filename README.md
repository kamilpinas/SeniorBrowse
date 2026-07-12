# SeniorBrowse

### You set it up. They just browse.

The Chrome extension that makes the internet safe and easy for the people you love — while giving you full control behind the scenes.

**[Add to Chrome — It's Free →](https://chromewebstore.google.com/detail/seniorbrowse/pkmalnikjbfdeomlekjfidpidmamefkn)** &nbsp;·&nbsp; [See how it works](https://seniorbrowse.pages.dev)

---

## Finally, the internet without the stress.

Does your parent or grandparent struggle with confusing websites, scary pop-ups, or accidentally clicking the wrong thing? **SeniorBrowse** turns Chrome into a calm, simple, and safe experience built just for them — no tech knowledge required.

You set it up once. They browse with confidence every day.

---

## What your loved one sees

<table>
<tr>
<td width="50%">

**A warm, personal home screen**
Every new tab greets them by name with a live clock, a big easy search bar, their most-visited sites, and their favourite websites as large, clearly labelled tiles. Nothing cluttered. Nothing confusing.

</td>
<td width="50%">

**A helper panel, always there**
A friendly panel sits on the side of every webpage with big labelled buttons — go home, go back or forward, adjust the volume, move the page, make text bigger, save the page, go fullscreen, refresh, or close the tab. If they get lost, help is one tap away.

</td>
</tr>
</table>

The panel opens from the toolbar or with the keyboard shortcut **Alt+Shift+P**.

---

## What you get as a caregiver

- **Full control, invisible to them** — unlock a private settings panel with your 4-digit PIN. Change anything at any time without disturbing them.
- **Safety on autopilot** — known malware and phishing sites are blocked before they even load. Downloads are stopped automatically. Ads and misleading "Download" buttons are stripped out. Blocked pages get replaced with a calm, friendly message.
- **Activity log** — see every page they visited, every search they made, and every page they saved, with timestamps. Stay informed without being intrusive. The log auto-expires after 90 days and can be cleared at any time.
- **Customise everything** — add, remove and reorder their favourite websites, resize the tiles, rename or hide any helper-panel button, and reorder the panel to suit them.
- **Restart the tour anytime** — if they forget how something works, one click restarts the guided walkthrough.

---

## Built for seniors. Designed for peace of mind.

| For the Senior | For the Caregiver |
|---|---|
| Personalised greeting by name | PIN-protected settings |
| Big shortcut tiles with icons | Add, remove, reorder and resize shortcuts |
| Text size button — one tap makes everything bigger | Control text size defaults |
| Helper panel on every single page | Reorder, rename or hide panel buttons |
| Volume, scroll, fullscreen and refresh helpers | Everything toggleable per button |
| Guided step-by-step tour on first use | Restart the tour whenever needed |
| Light and dark mode, three warm accent colours | Choose the theme and accent from settings |
| No pop-ups, no ads, no scary warnings | Fine-tune every security rule |

---

## Invisible protection. Every visit.

SeniorBrowse protects quietly in the background — your loved one never needs to make a single security decision.

- **Malware & phishing blocking** — known dangerous domains are blocked automatically from a bundled, periodically-refreshed list
- **Downloads disabled** — no accidental file downloads that could install harmful software
- **Ad blocking** — no flashing banners, no misleading "Download" buttons, no pop-ups
- **Your own block list** — add any website you don't want them to visit

Every one of these is on by default, and every one can be toggled from the PIN-protected **Safety** settings.

---

## How it works

**Step 1 — You set it up** (takes about 5 minutes)
A guided setup wizard walks you through entering names, choosing a PIN, adding favourite websites, sizing the tiles, picking a theme, and choosing safety settings. No technical knowledge needed.

**Step 2 — They get a personal tour**
After setup, a friendly spotlight walkthrough guides your loved one through every feature of their new home screen — at their own pace, in plain language.

**Step 3 — Browse together, safely**
You stay in the background. They browse with confidence. Check in on the activity log whenever you like.

---

## Completely free

No account, no trial, no subscription. Install it and every feature is available right away — for you and for them.

---

## Privacy

Everything stays on the device. SeniorBrowse stores its settings, saved pages, and activity log in local Chrome storage — nothing is sent to a server, and there is no account to create. The PIN itself is never stored in plain text: it's protected with PBKDF2-SHA256 (100,000 iterations) and a random salt, with an exponential lockout after repeated wrong attempts.

See [Privacy Policy](docs/PRIVACY_POLICY.md) and [Terms of Service](docs/TERMS_OF_SERVICE.md).

---

## Frequently asked questions

**Does my loved one need to do anything to set it up?**
No. You handle the entire setup. They just open a new tab and start browsing.

**Can they accidentally change the settings?**
No. Settings are locked behind a PIN only you know. Everything they see is read-only.

**What happens if they visit a blocked website?**
They see a calm, friendly page telling them to go back — no scary warnings, no technical language, no alarm.

**Will it slow down their computer?**
No. SeniorBrowse is a lightweight Chrome extension with no impact on browsing speed.

**What if I want to change something later?**
Open the settings panel with your PIN, make your changes, done. Changes take effect instantly.

**Does it work on any computer?**
It works on any computer with Google Chrome installed — Windows, Mac, or Chromebook.

---

## Install SeniorBrowse

1. [Add the extension from the Chrome Web Store](https://chromewebstore.google.com/detail/seniorbrowse/pkmalnikjbfdeomlekjfidpidmamefkn)
2. Open a new tab — the setup wizard starts automatically
3. Follow the 5-minute guided setup

**[Add to Chrome — It's Free →](https://chromewebstore.google.com/detail/seniorbrowse/pkmalnikjbfdeomlekjfidpidmamefkn)**

---

## For developers

SeniorBrowse is a Manifest V3 Chrome extension built with React, TypeScript and Vite.

```bash
npm install        # install dependencies
npm run dev        # Vite dev server for the new-tab / panel pages
npm run build      # build the full extension into dist/
npm run typecheck  # tsc --noEmit
npm test           # Vitest unit tests
npm run test:e2e   # Playwright end-to-end tests (builds first)
```

Load the unpacked extension for local testing:

1. Run `npm run build`
2. Open `chrome://extensions/` and enable **Developer mode**
3. Click **Load unpacked** and select the `dist/` folder

**Project layout**

| Path | What lives there |
|---|---|
| `src/newtab/` | Personalised home screen, onboarding wizard, senior walkthrough, PIN-protected settings |
| `src/content/` | The always-there helper side panel injected into every page |
| `src/sidepanel/` | Chrome side-panel UI (home, back/forward, volume, scroll, zoom, save, fullscreen, refresh, close) |
| `src/background/` | Service worker: download blocking, ad blocking, malware/phishing blocklist, activity logging |
| `src/shared/` | Types, storage, constants, PIN hashing, shared UI helpers |
| `public/` | Manifest, icons, blocked/warning pages, rules, brand assets |
| `docs/` | Privacy policy, terms, store listing, architecture and market notes |

---

*SeniorBrowse — Making the internet a safer place, one family at a time.*
