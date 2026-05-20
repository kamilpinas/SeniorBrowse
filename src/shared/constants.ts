// Shared constants used across the extension.
// Value-list arrays must stay in sync with the matching string-union types in types.ts.

import type {
  Config,
  FontSize,
  PanelButtonConfig,
  PanelPosition,
  ShortcutSize,
  SuspiciousLinkMode,
  ActivityType,
  SubscriptionStatus,
  Theme,
  ThemeColor,
} from "./types"

export const MAX_LOG_ENTRIES = 1000

// Trial flow — server-enforced via Supabase edge functions.
export const TRIAL_DAYS = 7
export const GRACE_DAYS = 3
export const TRIAL_WARNING_DAYS = 2

// How often the extension re-validates the license with the server (ms).
export const LICENSE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000 // 24 hours

// If the server is unreachable, the extension keeps working for this long
// before locking. Prevents losing access during short internet outages.
export const LICENSE_OFFLINE_GRACE_MS = 3 * 24 * 60 * 60 * 1000 // 3 days

// UX timings.
export const UNDO_TOAST_MS = 5000

// Value-list enums (runtime arrays paired with string-union types).
export const FONT_SIZES: readonly FontSize[] = ["normal", "large", "xlarge"]
export const THEMES: readonly Theme[] = ["light", "dark"]
export const THEME_COLORS: readonly ThemeColor[] = ["red", "blue", "green"]

/** Accent swatch colour shown in the theme picker — matches the active light-mode --color-accent. */
export const THEME_COLOR_SWATCH: Record<ThemeColor, string> = {
  red: "#9c3520",
  blue: "#2456a0",
  green: "#2c7a3d",
}

/** User-visible label for each theme colour (used by wizard + settings). */
export const THEME_COLOR_LABEL: Record<ThemeColor, string> = {
  red: "Warm Red",
  blue: "Ocean Blue",
  green: "Forest Green",
}
export const PANEL_POSITIONS: readonly PanelPosition[] = ["left", "right"]
export const SHORTCUT_SIZES: readonly ShortcutSize[] = [
  "small",
  "medium",
  "large",
  "xl",
  "xl2",
]
export const SUSPICIOUS_LINK_MODES: readonly SuspiciousLinkMode[] = [
  "block",
  "warn",
  "off",
]
export const ACTIVITY_TYPES: readonly ActivityType[] = [
  "visit",
  "search",
  "save",
]
export const SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = [
  "trial",
  "active",
  "grace",
  "expired",
  "not_found",
]

// User-visible font size labels — shown on the panel zoom button (P-04).
export const FONT_SIZE_LABELS: Record<FontSize, string> = {
  normal: "normal",
  large: "large",
  xlarge: "x-large",
}

// ── Panel button defaults (A-07, A-08) ───────────────────────────────────────

/** Canonical button IDs in default display order. */
export const DEFAULT_PANEL_BUTTON_ORDER: string[] = [
  "home",
  "back",
  "forward",
  "volume",
  "scroll",
  "zoom",
  "save",
  "fullscreen",
  "refresh",
  "exit",
]

/** Default label + visibility for each button. */
export const DEFAULT_PANEL_BUTTONS: Record<string, PanelButtonConfig> = {
  home: { label: "HOME", visible: true },
  back: { label: "BACK", visible: true },
  forward: { label: "FORWARD", visible: true },
  volume: { label: "VOLUME", visible: true },
  scroll: { label: "MOVE PAGE", visible: true },
  zoom: { label: "TEXT SIZE", visible: true },
  save: { label: "SAVE PAGE", visible: true },
  fullscreen: { label: "FULLSCREEN", visible: true },
  refresh: { label: "REFRESH", visible: true },
  exit: { label: "CLOSE PAGE", visible: true },
}

export const DEFAULT_CONFIG: Config = {
  caregiverName: "",
  seniorName: "",
  panelPosition: "right",
  defaultFontSize: "normal",
  security: {
    blockDownloads: true,
    blockSuspiciousLinks: "warn",
    blockAds: true,
    whitelist: [],
    blacklist: [],
  },
  ui: {
    showHistory: false,
    showBrowserSettings: false,
  },
  panelButtonOrder: DEFAULT_PANEL_BUTTON_ORDER,
  panelButtons: DEFAULT_PANEL_BUTTONS,
  onboardingDone: false,
  panelWizardDone: false,
  adminPin: "1234",
  shortcutSize: "medium",
  panelEnabled: true,
  theme: "light",
  themeColor: "red",
}
