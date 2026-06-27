import { useState } from "react"
import { ArrowRightIcon, RulerIcon } from "@phosphor-icons/react"
import { SHORTCUT_SIZES } from "@shared/constants"
import type { ShortcutSize } from "@shared/types"
import { heading, body, primaryBtn } from "./shared"

// Step 3: Shortcut size
const SIZE_META: Record<
  ShortcutSize,
  { label: string; px: number; hint: string }
> = {
  small: { label: "Small", px: 72, hint: "Compact — fits more tiles" },
  medium: { label: "Medium", px: 96, hint: "Balanced — good for most" },
  large: { label: "Large", px: 120, hint: "Easier to tap" },
  xl: { label: "X-Large", px: 148, hint: "Very easy to see and tap" },
  xl2: { label: "Biggest", px: 176, hint: "Maximum size" },
}

export function StepShortcutSize({
  onNext,
}: {
  onNext: (size: ShortcutSize) => void
}) {
  const [selected, setSelected] = useState<ShortcutSize>("medium")

  return (
    <>
      <div
        style={{ textAlign: "center" as const, color: "var(--color-accent)" }}
      >
        <RulerIcon size={48} weight="fill" />
      </div>
      <div>
        <h2 style={heading}>How big should the tiles be?</h2>
        <p style={{ ...body, marginTop: "0.5rem" }}>
          Choose the size that works best for the senior's eyesight and hands.
          You can change this at any time in settings.
        </p>
      </div>

      {/* Two-column grid — keeps the 5 options compact instead of a tall
          5-row stack so the step fits the card without scrolling. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: "0.5rem",
        }}
      >
        {SHORTCUT_SIZES.map((size) => {
          const meta = SIZE_META[size]
          const isSelected = selected === size
          return (
            <button
              key={size}
              type="button"
              onClick={() => setSelected(size)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-md)",
                border: `2px solid ${isSelected ? "var(--color-accent)" : "var(--color-surface-edge)"}`,
                background: isSelected
                  ? "var(--color-accent-xlight)"
                  : "var(--color-surface)",
                cursor: "pointer",
                textAlign: "left" as const,
                transition: "border-color 0.15s, background 0.15s",
              }}
            >
              {/* Tile preview */}
              <div
                style={{
                  width: meta.px * 0.5,
                  height: meta.px * 0.5,
                  borderRadius: 8,
                  background: isSelected
                    ? "var(--color-accent)"
                    : "var(--color-surface-edge)",
                  flexShrink: 0,
                  transition: "background 0.15s, width 0.15s, height 0.15s",
                }}
              />
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    color: "var(--color-text)",
                  }}
                >
                  {meta.label}
                </div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {meta.hint}
                </div>
              </div>
              {isSelected && (
                <span
                  style={{
                    marginLeft: "auto",
                    color: "var(--color-accent)",
                    fontWeight: 800,
                    fontSize: "1.1rem",
                  }}
                >
                  ✓
                </span>
              )}
            </button>
          )
        })}
      </div>

      <button
        style={primaryBtn}
        onClick={() => onNext(selected)}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--color-accent-strong)"
          e.currentTarget.style.transform = "scale(1.02)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--color-accent)"
          e.currentTarget.style.transform = "scale(1)"
        }}
      >
        Next <ArrowRightIcon size={18} />
      </button>
    </>
  )
}
