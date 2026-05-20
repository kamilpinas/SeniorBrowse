// Reusable accent-colour picker used by the onboarding wizard and Settings.
// Three large swatches (red / blue / green) shown as an ARIA radiogroup.

import { CheckIcon } from "@phosphor-icons/react"
import {
  THEME_COLORS,
  THEME_COLOR_LABEL,
  THEME_COLOR_SWATCH,
} from "@shared/constants"
import type { ThemeColor } from "@shared/types"

interface Props {
  value: ThemeColor
  onChange: (next: ThemeColor) => void
  /** Optional accessible label used by aria-labelledby on the radiogroup. */
  labelledBy?: string
}

export function ThemeColorPicker({ value, onChange, labelledBy }: Props) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: "0.75rem",
      }}
    >
      {THEME_COLORS.map((c) => {
        const selected = value === c
        const swatch = THEME_COLOR_SWATCH[c]
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={THEME_COLOR_LABEL[c]}
            onClick={() => onChange(c)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.85rem 0.6rem",
              borderRadius: "var(--radius-md)",
              border: `2px solid ${selected ? swatch : "var(--color-surface-edge)"}`,
              background: selected
                ? "var(--color-surface-raised)"
                : "var(--color-surface)",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "border-color 0.18s, background 0.18s, transform 0.18s cubic-bezier(0.22,1,0.36,1)",
              transform: selected ? "translateY(-1px)" : "translateY(0)",
            }}
            onMouseEnter={(e) => {
              if (!selected) {
                e.currentTarget.style.borderColor = "var(--color-surface-edge-mid)"
              }
            }}
            onMouseLeave={(e) => {
              if (!selected) {
                e.currentTarget.style.borderColor = "var(--color-surface-edge)"
              }
            }}
          >
            {/* Swatch — actual colour preview */}
            <span
              aria-hidden="true"
              style={{
                position: "relative",
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: swatch,
                boxShadow: selected
                  ? `0 0 0 4px var(--color-bg), 0 0 0 6px ${swatch}, var(--shadow-md)`
                  : "var(--shadow-sm)",
                transition: "box-shadow 0.18s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              {selected && <CheckIcon size={28} weight="bold" />}
            </span>
            <span
              style={{
                fontSize: "0.9rem",
                fontWeight: selected ? 700 : 600,
                color: "var(--color-text)",
                textAlign: "center",
              }}
            >
              {THEME_COLOR_LABEL[c]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
