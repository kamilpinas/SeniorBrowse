import { useState } from "react"
import type { Shortcut, ShortcutSize } from "@shared/types"
import { TILE_CFG } from "./shared"
import { ShortcutIcon } from "./ShortcutIcon"

export function ViewTile({
  shortcut,
  size,
}: {
  shortcut: Shortcut
  size: ShortcutSize
}) {
  const cfg = TILE_CFG[size]
  const [hovered, setHovered] = useState(false)

  return (
    <a
      href={shortcut.url}
      target="_self"
      aria-label={shortcut.label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: cfg.gap,
        padding: cfg.padding,
        background: hovered ? "var(--color-surface)" : "transparent",
        border: `1.5px solid ${hovered ? "var(--color-surface-edge)" : "transparent"}`,
        borderRadius: "var(--radius-md)",
        boxShadow: hovered ? "var(--shadow-soft)" : "none",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        transition:
          "background 0.2s cubic-bezier(0.22,1,0.36,1), border-color 0.2s cubic-bezier(0.22,1,0.36,1), box-shadow 0.2s cubic-bezier(0.22,1,0.36,1), transform 0.22s cubic-bezier(0.22,1,0.36,1)",
        textDecoration: "none",
        cursor: "pointer",
        minHeight: 80,
        // A8: let the global :focus-visible rule supply the outline —
        // don't suppress it with outline:none then manually reinstate it.
      }}
    >
      <ShortcutIcon shortcut={shortcut} size={size} />
      <span
        style={{
          fontSize: cfg.fontSize,
          fontWeight: 500,
          color: "var(--color-text)",
          lineHeight: 1.3,
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {shortcut.label}
      </span>
    </a>
  )
}
