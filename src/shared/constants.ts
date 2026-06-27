// Shared constants used across the extension.
// Value-list arrays must stay in sync with the matching string-union types in types.ts.

import type {
  Config,
  FontSize,
  PanelButtonConfig,
  PanelPosition,
  ShortcutSize,
  ActivityType,
  ThemeColor,
} from "./types"

export const MAX_LOG_ENTRIES = 1000
// Activity log entries older than this are dropped on every write, so the
// log can't grow into an indefinite record of everywhere the senior has
// browsed — it's a recent-activity view for the caregiver, not an archive.
export const MAX_LOG_AGE_DAYS = 90

// UX timings.
export const UNDO_TOAST_MS = 5000

// Value-list enums (runtime arrays paired with string-union types).
export const FONT_SIZES: readonly FontSize[] = ["normal", "large", "xlarge"]
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
export const ACTIVITY_TYPES: readonly ActivityType[] = [
  "visit",
  "search",
  "save",
]

// User-visible font size labels — shown on the panel zoom button.
export const FONT_SIZE_LABELS: Record<FontSize, string> = {
  normal: "normal",
  large: "large",
  xlarge: "x-large",
}

// ── Panel button defaults ─────────────────────────────────────────────────

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
    blockAds: true,
    blacklist: [],
    blockKnownMalware: true,
  },
  ui: {
    showHistory: false,
    showBrowserSettings: false,
  },
  panelButtonOrder: DEFAULT_PANEL_BUTTON_ORDER,
  panelButtons: DEFAULT_PANEL_BUTTONS,
  onboardingDone: false,
  panelWizardDone: false,
  // No default PIN — the caregiver must choose one during onboarding
  // (see OnboardingWizard's StepPin). An empty hash means "not set yet";
  // verifyPin() always rejects in that state.
  pinHash: "",
  pinSalt: "",
  shortcutSize: "medium",
  panelEnabled: true,
  theme: "light",
  themeColor: "red",
}
