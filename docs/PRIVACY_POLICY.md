# SeniorBrowse Privacy Policy

**Last updated:** June 27, 2026

SeniorBrowse ("the extension", "we", "us") is a free Chrome extension that helps caregivers set up a safer, simpler browsing experience for a loved one. This page explains what data the extension collects, why, and how it's handled.

If you have questions not answered here, contact us at **kamilpinas@gmail.com**.

---

## 1. What we collect

### What we do NOT collect
SeniorBrowse does **not** collect, store, or transmit:
- Keystroke logs or typing history
- Screen recordings or screenshots
- Mouse movements or clicks
- Audio, video, or webcam data
- Payment or financial information
- Location data
- Social media credentials or logins

### What we do collect

#### Activity log — stays on the device
When enabled by the caregiver, SeniorBrowse records the pages visited, searches made, and pages saved by the senior user: the URL, page title, a timestamp, and the activity type (visit / search / save).

- This log is stored **only** in the browser's local extension storage (`chrome.storage.local`) on the senior's own computer.
- It is **never sent to our servers or any third party.**
- Entries older than 90 days are deleted automatically, and the log is capped at the most recent 1,000 entries.
- The caregiver can clear this log at any time from the settings panel.

### Caregiver PIN — never leaves the device
The caregiver sets a 4-digit PIN to lock the settings panel. The PIN itself is **never stored or transmitted**. Instead, the extension stores a one-way PBKDF2-SHA256 hash and a random salt, both useless for recovering the original PIN. We cannot see, recover, or reset a forgotten PIN — uninstalling and reinstalling the extension is the only reset path, which also clears all locally stored data.

### Malicious-site blocking — fully local, no browsing data ever sent
SeniorBrowse blocks known malware/phishing domains using a list bundled inside the extension, topped up by an automatic periodic download of a free public threat list from [abuse.ch (URLhaus)](https://urlhaus.abuse.ch/). That download is one-way: the extension fetches a public list of bad domains — it never sends the sites the senior visits, search terms, or any other personal data to abuse.ch or anywhere else. The check itself happens entirely on-device.

This feature, along with the caregiver's own block list, can be turned off entirely in settings.

### Configuration data — stays on the device
Shortcuts, button labels, theme, text size, and other settings the caregiver configures are stored locally in the browser and are never transmitted to us.

---

## 2. Third parties we use

We don't run a backend and don't send your data anywhere. The one outbound network request SeniorBrowse makes on its own is a periodic, one-way download of a public list of known-malicious domains from abuse.ch (URLhaus) — that request carries no personal data, browsing history, or anything else about you or the senior using the device.

We do not use advertising networks, analytics/tracking SDKs, or sell any data to third parties.

---

## 3. Data retention and deletion

- **Activity log:** auto-deleted after 90 days; can be cleared manually at any time.
- **Local settings, shortcuts, PIN hash:** stored until the extension is uninstalled, which removes all locally stored data immediately.

---

## 4. Security

### PIN protection and hashing
The caregiver PIN is protected using **PBKDF2-SHA256** with 100,000 iterations and a random salt. This is a cryptographic one-way hash — even if someone gained access to your device's storage, they could not recover the original PIN or unlock the settings panel.

After 5 incorrect PIN attempts, the numpad locks for an escalating duration (30 seconds to 1 hour). Repeated attempts cannot brute-force the PIN.

### Local storage
All data is stored in Chrome's `chrome.storage.local`, which is isolated from other extensions and websites. Each extension has its own encrypted storage area.

### No third-party servers
Because SeniorBrowse has no backend, there is no single server where all user data could be breached. Your data exists only on the device where the extension is installed.

---

## 5. Children's privacy

SeniorBrowse is designed for use by adults (caregivers setting up the extension for another adult). It is not directed at children, and we do not knowingly collect data from children.

---

## 6. Changes to this policy

We may update this policy as the extension evolves. Material changes will be reflected here with an updated "Last updated" date.

---

## 7. Contact

Questions about this policy or your data: **kamilpinas@gmail.com**
