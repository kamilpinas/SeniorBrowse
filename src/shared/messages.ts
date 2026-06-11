// B-01: Typed chrome.runtime message bus.
// Background ↔ content scripts / extension pages.

import type { ActivityType, FontSize } from './types'

// ── Incoming (content / sidepanel → background) ───────────────────────────────

export type IncomingMessage =
  | { type: 'TOGGLE_ADMIN_MODE' }
  | { type: 'SET_ADMIN_MODE'; payload: { active: boolean } }
  | { type: 'CHECK_TRIAL_STATUS' }
  | { type: 'LOG_ACTIVITY'; payload: { url: string; title: string; type: ActivityType } }
  | { type: 'BYPASS_URL'; payload: { url: string } }
  | { type: 'OPEN_SIDE_PANEL' }

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
  // newtab → sidepanel: ask the panel page to window.close() itself.
  // Sent from the expired ("Just a short pause") screen so the senior can
  // dismiss the panel without hunting for Chrome's native ✕.
  | { type: 'CLOSE_PANEL_REQUEST' }

// ── Response envelope ────────────────────────────────────────────────────────

export type MessageResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string }
