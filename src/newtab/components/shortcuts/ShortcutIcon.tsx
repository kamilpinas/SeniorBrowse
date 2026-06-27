import { useState } from "react"
import type { Shortcut, ShortcutSize } from "@shared/types"
import { TILE_CFG } from "./shared"

// ── Avatar helpers ────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  "#9c3520",   // updated to match current accent
  "#2a6dc2",
  "#2a9c6d",
  "#8c4cc2",
  "#c2872a",
  "#c24a4a",
  "#2a8cb0",
  "#6d7c2a",
]

function getAvatarColor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length] ?? "#9c3520"
}

export function ShortcutIcon({
  shortcut,
  size = shortcut.size,
}: {
  shortcut: Shortcut
  size?: ShortcutSize
}) {
  const [failed, setFailed] = useState(false)
  const { iconSize } = TILE_CFG[size]

  if (shortcut.iconUrl && !failed) {
    return (
      <img
        src={shortcut.iconUrl}
        alt=""
        width={iconSize}
        height={iconSize}
        onError={() => setFailed(true)}
        style={{ objectFit: "contain", display: "block", borderRadius: 4 }}
      />
    )
  }

  const letter = (shortcut.label.trim()[0] ?? "?").toUpperCase()
  const bg = getAvatarColor(shortcut.url || shortcut.label)

  return (
    <div
      aria-hidden="true"
      style={{
        width: iconSize,
        height: iconSize,
        borderRadius: "50%",
        background: bg,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.round(iconSize * 0.42),
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {letter}
    </div>
  )
}
