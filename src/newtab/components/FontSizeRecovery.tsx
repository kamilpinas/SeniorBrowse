// Recovery prompt shown when the senior changed font size last session and
// it differs from the caregiver's default.

interface Props {
  seniorName: string
  onKeep: () => void
  onRevert: () => void
}

const nameGlow: React.CSSProperties = {
  color: "var(--color-accent)",
  fontWeight: 800,
}

export function FontSizeRecovery({ seniorName, onKeep, onRevert }: Props) {
  const name = seniorName.trim()

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Text size changed"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "1rem",
        padding: "1rem 1.5rem",
        background: "var(--color-surface)",
        border: "1.5px solid var(--color-surface-edge)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <p
        style={{ margin: 0, fontSize: "1.0625rem", color: "var(--color-text)" }}
      >
        {name ? (
          <><span style={nameGlow}>{name}</span>, last time you used larger text.</>
        ) : (
          <>There, last time you used larger text.</>
        )}{" "}
        <span style={{ color: "var(--color-text-muted)" }}>
          Would you like to keep it that way?
        </span>
      </p>

      <div style={{ display: "flex", gap: "0.75rem", flexShrink: 0 }}>
        <button
          onClick={onKeep}
          style={{
            padding: "0.5rem 1.25rem",
            fontSize: "1.05rem",
            fontWeight: 600,
            fontFamily: "inherit",
            color: "var(--color-text)",
            background: "transparent",
            border: "1.5px solid var(--color-surface-edge)",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
            transition: "background 0.15s, border-color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--color-surface)"
            e.currentTarget.style.borderColor = "var(--color-surface-edge-mid)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent"
            e.currentTarget.style.borderColor = "var(--color-surface-edge)"
          }}
        >
          Keep larger
        </button>

        <button
          onClick={onRevert}
          style={{
            padding: "0.5rem 1.25rem",
            fontSize: "1.05rem",
            fontWeight: 600,
            fontFamily: "inherit",
            color: "#fff",
            background: "var(--color-accent)",
            border: "none",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--color-accent-strong)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--color-accent)"
          }}
        >
          Back to normal
        </button>
      </div>
    </div>
  )
}
