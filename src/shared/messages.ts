// Typed chrome.runtime message bus.
// Background ↔ content scripts / extension pages.

import type { ActivityType, FontSize } from './types'

// ── Incoming (content / sidepanel → background) ───────────────────────────────

export type IncomingMessage =
  | { type: 'TOGGLE_ADMIN_MODE' }
  | { type: 'SET_ADMIN_MODE'; payload: { active: boolean } }
  | { type: 'LOG_ACTIVITY'; payload: { url: string; title: string; type: ActivityType } }
  | { type: 'OPEN_SIDE_PANEL' }
  // Caregiver-triggered "Update now" in Settings — refreshRemoteList() only
  // runs in the background context, so the Settings page asks for it here.
  | { type: 'REFRESH_MALWARE_LIST' }

// ── Side-panel → content-script commands (sent via chrome.tabs.sendMessage) ──

export type TabCommand =
  | { type: 'TAB_COMMAND'; payload: { command: 'scrollTop' } }
  | { type: 'TAB_COMMAND'; payload: { command: 'scrollBy'; delta: number } }  // delta: 1=down, -1=up
  | { type: 'TAB_COMMAND'; payload: { command: 'getScrollPos' } }
  | { type: 'TAB_COMMAND'; payload: { command: 'applyFont'; size: FontSize } }
  | { type: 'TAB_COMMAND'; payload: { command: 'setVolume'; level: number } }

// ── Outgoing (background → content) ──────────────────────────────────────────

export type OutgoingMessage =
  | { type: 'ADMIN_MODE_CHANGED'; payload: { active: boolean } }
  | { type: 'CONFIG_UPDATED' }

// ── Response envelope ────────────────────────────────────────────────────────

export type MessageResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string }
