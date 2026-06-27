import { useState } from "react"

interface TileProps {
  id: string
  label: string
  icon: React.ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: "default" | "primary" | "danger"
  fullWidth?: boolean
  tourTarget?: string
  labelFontSize?: string
}

export function Tile({
  id,
  label,
  icon,
  onClick,
  disabled = false,
  variant = "default",
  fullWidth = false,
  tourTarget,
  labelFontSize = "1.2rem",
}: TileProps) {
  const [hov, setHov] = useState(false)
  const [pressed, setPressed] = useState(false)

  const isPrimary = variant === "primary"
  const isDanger = variant === "danger"

  // Background logic
  let bg = "var(--sw-surface)"
  if (isPrimary)
    bg = hov ? "var(--sw-accent-btn-hover)" : "var(--sw-accent-btn)"
  else if (isDanger) bg = hov ? "var(--sw-danger-light)" : "var(--sw-surface)"
  else if (hov) bg = "var(--sw-accent-light)"

  // Text / icon colour
  let fg = "var(--sw-text-muted)"
  if (isPrimary) fg = "#fff"
  else if (isDanger) fg = hov ? "var(--sw-danger)" : "var(--sw-text-muted)"
  else if (hov) fg = "var(--sw-accent)"

  // Border
  let border = `1.5px solid ${hov && !isPrimary ? "var(--sw-accent-light)" : "var(--sw-surface-edge)"}`
  if (isPrimary) border = "none"
  if (isDanger && hov) border = `1.5px solid var(--sw-danger)`

  return (
    <button
      key={id}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      data-panel-tour={tourTarget}
      onMouseEnter={() => {
        if (!disabled) setHov(true)
      }}
      onMouseLeave={() => {
        setHov(false)
        setPressed(false)
      }}
      onMouseDown={() => {
        if (!disabled) setPressed(true)
      }}
      onMouseUp={() => setPressed(false)}
      style={{
        gridColumn: fullWidth ? "span 2" : undefined,
        minWidth: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        // Tight gap + vertical padding so content fits the 1fr grid row
        // at the 768px floor (9 rows × ~78px each). Both clamp upward
        // with viewport so larger panels get more breathing room.
        gap: fullWidth ? "0.6rem" : "clamp(0.2rem, 0.7vh, 0.45rem)",
        padding: fullWidth
          ? "clamp(0.5rem, 1.4vh, 0.95rem) 1rem"
          : "clamp(0.3rem, 0.9vh, 0.7rem) 0.4rem",
        minHeight: fullWidth ? 50 : 60,
        background: bg,
        border,
        borderRadius: "var(--sw-radius)",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.38 : 1,
        color: fg,
        fontFamily: "inherit",
        // Clip any per-pixel rounding so descenders never get cut by a
        // neighbouring tile's background.
        overflow: "hidden",
        transition:
          "background 0.15s, color 0.15s, border-color 0.15s, box-shadow 0.15s",
        transform: pressed ? "scale(0.95)" : hov ? "scale(1.02)" : "scale(1)",
        boxShadow: isPrimary
          ? hov
            ? "0 6px 20px rgba(160, 74, 28, 0.45)"
            : "0 3px 10px rgba(194, 94, 42, 0.28)"
          : hov
            ? "var(--sw-shadow-md)"
            : "none",
      }}
    >
      {/* Icon — wrapper font-size drives Phosphor SVG size via the
          [data-tile-icon] svg rule in sidepanel/index.html */}
      <span
        data-tile-icon
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 0,
          flexDirection: fullWidth ? "row" : "column",
          gap: fullWidth ? "0.6rem" : 0,
          fontSize: fullWidth
            ? "clamp(28px, 3.6vh, 44px)"
            : "clamp(28px, 4vh, 48px)",
        }}
      >
        {icon}

        {/* Inline label for full-width buttons */}
        {fullWidth && (
          <span
            style={{
              fontSize: `clamp(${labelFontSize}, 2.4vh, 1.9rem)`,
              fontWeight: 700,
              letterSpacing: "0.01em",
              lineHeight: 1.15,
            }}
          >
            {label}
          </span>
        )}
      </span>

      {/* Label below icon for tile buttons */}
      {!fullWidth && (
        <span
          style={{
            fontSize: `clamp(${labelFontSize}, 2.2vh, 1.7rem)`,
            fontWeight: 700,
            letterSpacing: "0.01em",
            // Tight line-height so descenders (g, y, p) don't push the
            // baseline past the tile's vertical bound at the 768px floor.
            lineHeight: 1.05,
            // Add a touch of vertical breathing room for descenders.
            paddingBottom: "0.1em",
            textAlign: "center",
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
      )}
    </button>
  )
}
