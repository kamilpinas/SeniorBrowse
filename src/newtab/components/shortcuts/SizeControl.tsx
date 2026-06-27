import type { ShortcutSize } from "@shared/types"

const SIZES: ShortcutSize[] = ["small", "medium", "large", "xl", "xl2"]

// Human-readable size labels for the SizeControl bar.
const SIZE_NAMES: Record<ShortcutSize, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  xl: "X-Large",
  xl2: "XX-Large",
}

function stepBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    borderRadius: 8,
    border: "1.5px solid var(--color-surface-edge)",
    background: disabled ? "transparent" : "var(--color-bg)",
    cursor: disabled ? "default" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.1rem",
    fontWeight: 700,
    lineHeight: 1,
    padding: 0,
    color: disabled ? "var(--color-surface-edge)" : "var(--color-text-muted)",
    transition: "background 0.12s, border-color 0.12s",
  }
}

interface SizeControlProps {
  size: ShortcutSize
  onChange: (size: ShortcutSize) => void
}

export function SizeControl({ size, onChange }: SizeControlProps) {
  const idx = SIZES.indexOf(size)
  const canShrink = idx > 0
  const canGrow = idx < SIZES.length - 1

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.6rem",
        padding: "0.45rem 0.85rem",
        background: "var(--color-surface)",
        border: "1.5px solid var(--color-surface-edge)",
        borderRadius: "var(--radius-md)",
        alignSelf: "flex-start",
        userSelect: "none",
      }}
    >
      {/* Aa icon — visual cue that this is a size control */}
      <span
        style={{
          fontSize: "1rem",
          fontWeight: 700,
          color: "var(--color-text-muted)",
          lineHeight: 1,
          marginRight: 2,
        }}
        aria-hidden="true"
      >
        Aa
      </span>

      <span
        style={{
          fontSize: "0.8rem",
          fontWeight: 600,
          color: "var(--color-text-muted)",
          whiteSpace: "nowrap",
        }}
      >
        Shortcut size
      </span>

      <button
        type="button"
        onClick={() => canShrink && onChange(SIZES[idx - 1]!)}
        disabled={!canShrink}
        title="Make shortcuts smaller"
        style={stepBtnStyle(!canShrink)}
        onMouseEnter={(e) => {
          if (canShrink) {
            e.currentTarget.style.background = "var(--color-surface-raised)"
            e.currentTarget.style.borderColor = "var(--color-accent-light)"
          }
        }}
        onMouseLeave={(e) => {
          if (canShrink) {
            e.currentTarget.style.background = "var(--color-bg)"
            e.currentTarget.style.borderColor = "var(--color-surface-edge)"
          }
        }}
      >
        −
      </button>

      <span
        style={{
          fontSize: "0.875rem",
          fontWeight: 700,
          color: "var(--color-text)",
          minWidth: 72,
          textAlign: "center",
        }}
      >
        {SIZE_NAMES[size]}
      </span>

      <button
        type="button"
        onClick={() => canGrow && onChange(SIZES[idx + 1]!)}
        disabled={!canGrow}
        title="Make shortcuts larger"
        style={stepBtnStyle(!canGrow)}
        onMouseEnter={(e) => {
          if (canGrow) {
            e.currentTarget.style.background = "var(--color-surface-raised)"
            e.currentTarget.style.borderColor = "var(--color-accent-light)"
          }
        }}
        onMouseLeave={(e) => {
          if (canGrow) {
            e.currentTarget.style.background = "var(--color-bg)"
            e.currentTarget.style.borderColor = "var(--color-surface-edge)"
          }
        }}
      >
        +
      </button>
    </div>
  )
}
