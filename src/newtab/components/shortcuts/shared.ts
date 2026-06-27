import type { ShortcutSize } from "@shared/types"

// ── Tile size config ──────────────────────────────────────────────────────────
// Shared by ShortcutIcon, ViewTile, and AdminTile.

export const TILE_CFG: Record<
  ShortcutSize,
  { iconSize: number; fontSize: string; padding: string; gap: string }
> = {
  small: {
    iconSize: 40,
    fontSize: "1rem",
    padding: "0.5rem 0.5rem",
    gap: "0.5rem",
  },
  medium: {
    iconSize: 52,
    fontSize: "1rem",
    padding: "1.25rem 1rem",
    gap: "0.625rem",
  },
  large: {
    iconSize: 64,
    fontSize: "1.125rem",
    padding: "1.5rem 1.25rem",
    gap: "0.75rem",
  },
  xl: {
    iconSize: 76,
    fontSize: "1.25rem",
    padding: "1.5rem 1.25rem",
    gap: "0.75rem",
  },
  xl2: {
    iconSize: 100,
    fontSize: "1.25rem",
    padding: "1.5rem 1.25rem",
    gap: "0.75rem",
  },
}
