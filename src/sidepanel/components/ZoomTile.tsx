import { useState } from "react"
import { TextAaIcon } from "@phosphor-icons/react"
import { FONT_SIZES, FONT_SIZE_LABELS } from "@shared/constants"
import type { FontSize } from "@shared/types"

export function ZoomTile({
  label,
  currentSize,
  onClick,
  disabled,
}: {
  label: string
  currentSize: FontSize
  onClick: () => void
  disabled: boolean
}) {
  const [hov, setHov] = useState(false)
  const [pressed, setPressed] = useState(false)
  const sizeIdx = FONT_SIZES.indexOf(currentSize)

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={`${label}: ${FONT_SIZE_LABELS[currentSize]}`}
      data-panel-tour="zoom"
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
        minWidth: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        // 3 content rows (icon, dots, label) — gaps & padding scale tightly.
        gap: "clamp(0.15rem, 0.5vh, 0.35rem)",
        padding: "clamp(0.3rem, 0.9vh, 0.7rem) 0.4rem",
        minHeight: 60,
        background: hov ? "var(--sw-accent-light)" : "var(--sw-surface)",
        border: `1.5px solid ${hov ? "var(--sw-accent-light)" : "var(--sw-surface-edge)"}`,
        borderRadius: "var(--sw-radius)",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.38 : 1,
        color: hov ? "var(--sw-accent)" : "var(--sw-text-muted)",
        fontFamily: "inherit",
        overflow: "hidden",
        transition:
          "background 0.15s, color 0.15s, border-color 0.15s, box-shadow 0.15s",
        transform: pressed ? "scale(0.95)" : hov ? "scale(1.02)" : "scale(1)",
        boxShadow: hov ? "var(--sw-shadow-md)" : "none",
      }}
    >
      <span
        data-tile-icon
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 0,
          // Slightly smaller icon than a normal Tile — dots row eats height.
          fontSize: "clamp(22px, 3.2vh, 40px)",
        }}
      >
        <TextAaIcon size={28} weight="bold" />
      </span>

      {/* Step dots */}
      <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
        {FONT_SIZES.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === sizeIdx ? 6 : 4,
              height: i === sizeIdx ? 6 : 4,
              borderRadius: "50%",
              background:
                i <= sizeIdx ? "currentColor" : "var(--sw-surface-edge)",
              transition: "background 0.15s, width 0.15s, height 0.15s",
            }}
          />
        ))}
      </div>

      <span
        style={{
          fontSize: "clamp(1.05rem, 2vh, 1.6rem)",
          fontWeight: 700,
          letterSpacing: "0.01em",
          lineHeight: 1.05,
          paddingBottom: "0.1em",
          textAlign: "center",
        }}
      >
        {label}
      </span>
    </button>
  )
}
