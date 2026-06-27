// Persistent "Edit mode" banner shown when adminModeActive is true.

import { CheckIcon, GearIcon, PencilSimpleIcon } from "@phosphor-icons/react"

interface Props {
  onDone: () => void
  onOpenSettings: () => void
}

const ghostBtn: React.CSSProperties = {
  background: "rgba(255,255,255,0.22)",
  color: "#fff",
  border: "1.5px solid rgba(255,255,255,0.5)",
  borderRadius: 8,
  padding: "0.3rem 0.9rem",
  fontSize: "0.9rem",
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "0.4rem",
  transition: "background 0.15s",
}

export function AdminBanner({ onDone, onOpenSettings }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "var(--color-accent-strong)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.6rem 1.5rem",
        fontSize: "1.5rem",
        fontWeight: 600,
        boxShadow: "0 2px 10px rgba(0,0,0,0.28)",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <PencilSimpleIcon size={20} weight="bold" />
        Edit mode — rearrange shortcuts or open Settings
      </span>
      <div style={{ display: "flex", gap: "0.6rem" }}>
        <button
          onClick={onOpenSettings}
          style={ghostBtn}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.35)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.22)"
          }}
        >
          <GearIcon size={16} weight="bold" /> Settings
        </button>
        <button
          onClick={onDone}
          style={ghostBtn}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.35)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.22)"
          }}
        >
          <CheckIcon size={16} weight="bold" /> Done
        </button>
      </div>
    </div>
  )
}
