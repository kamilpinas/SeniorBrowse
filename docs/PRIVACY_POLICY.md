# SeniorBrowse Privacy Policy

**Last updated:** June 23, 2026

SeniorBrowse ("the extension", "we", "us") is a Chrome extension that helps caregivers set up a safer, simpler browsing experience for a loved one. This page explains what data the extension collects, why, and how it's handled.

If you have questions not answered here, contact us at **[TODO: SUPPORT_EMAIL — replace before publishing]**.

---

## 1. Data collected and why

### Activity log — stays on the device
When enabled by the caregiver, SeniorBrowse records the pages visited, searches made, and pages saved by the senior user: the URL, page title, a timestamp, and the activity type (visit / search / save).

- This log is stored **only** in the browser's local extension storage (`chrome.storage.local`) on the senior's own computer.
- It is **never sent to our servers or any third party.**
- Entries older than 90 days are deleted automatically, and the log is capped at the most recent 1,000 entries.
- The caregiver can clear this log at any time from the settings panel.

### Caregiver PIN — never leaves the device
The caregiver sets a 4-digit PIN to lock the settings panel. The PIN itself is **never stored or transmitted**. Instead, the extension stores a one-way PBKDF2-SHA256 hash and a random salt, both useless for recovering the original PIN. We cannot see, recover, or reset a forgotten PIN — uninstalling and reinstalling the extension is the only reset path, which also clears all locally stored data.

### Email address and license key — sent to our server
When the caregiver starts a free trial or subscribes, they provide an email address. This is sent to our backend (hosted on Supabase) to:
- create and look up the subscription/trial record,
- prevent the same person or device from claiming multiple free trials,
- send license-related communication (e.g., trial ending soon, payment receipts via our payment processor).

This data is protected by database-level access rules (Row Level Security) restricting who can read it. We do not sell or share this data with advertisers.

### Device install ID — sent to our server
On first install, the extension generates a random identifier (a UUID, not tied to your name, email, or hardware serial number) and sends it with the trial registration request. This is used solely to limit free-trial abuse (e.g., reinstalling to get another free trial). It cannot be used to identify you personally.

### URLs checked against Safe Browsing — sent to our server, then to Google
If the caregiver enables the "block dangerous websites" feature, each site the senior navigates to is sent to our backend, which forwards it to Google's Safe Browsing API to check whether it's known malware, phishing, or unwanted software. Results are cached so the same URL isn't checked twice. Google's use of this data is governed by [Google's Privacy Policy](https://policies.google.com/privacy). Our API key is never exposed inside the extension — all requests are proxied server-side.

This feature can be turned off entirely in settings, in which case no URLs are sent anywhere for this purpose.

### Configuration data — stays on the device
Shortcuts, button labels, theme, text size, and other settings the caregiver configures are stored locally in the browser and are never transmitted to us.

---

## 2. Third parties we use

| Service | Purpose | What it receives |
|---|---|---|
| **Supabase** | Hosts our backend database and serverless functions | Email, install ID, license status, URLs being safety-checked (transiently, not stored) |
| **Google Safe Browsing API** | Detects malicious/phishing websites | The URL being checked (via our server, never directly from your browser) |
| **Lemon Squeezy** | Payment processing for subscriptions | Billing/payment details — handled entirely by Lemon Squeezy; we never see or store card numbers |

We do not use advertising networks, analytics/tracking SDKs, or sell any data to third parties.

---

## 3. Data retention and deletion

- **Activity log:** auto-deleted after 90 days; can be cleared manually at any time.
- **Local settings, shortcuts, PIN hash:** stored until the extension is uninstalled, which removes all locally stored data immediately.
- **Email / license records on our server:** retained for as long as the subscription is active, plus a reasonable period for billing records. To request deletion of your account data, contact us at the support address above.

---

## 4. Children's privacy

SeniorBrowse is designed for use by adults (caregivers setting up the extension for another adult). It is not directed at children, and we do not knowingly collect data from children.

---

## 5. Changes to this policy

We may update this policy as the extension evolves. Material changes will be reflected here with an updated "Last updated" date.

---

## 6. Contact

Questions about this policy or your data: **[TODO: SUPPORT_EMAIL — replace before publishing]**
