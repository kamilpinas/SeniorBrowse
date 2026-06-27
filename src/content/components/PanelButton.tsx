/** @jsxImportSource preact */
import { useState } from "preact/hooks"

interface BtnProps {
  icon: () => preact.JSX.Element
  label: string
  onClick: () => void
  isPrimary?: boolean
  disabled?: boolean
}

export function PanelButton({
  icon: Icon,
  label,
  onClick,
  isPrimary = false,
  disabled = false,
}: BtnProps) {
  const [hovered, setHovered] = useState(false)

  const base: preact.JSX.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    width: "100%",
    padding: isPrimary ? "16px 14px" : "13px 14px",
    fontSize: isPrimary ? "17px" : "16px",
    fontWeight: 600,
    textAlign: "left" as const,
    color: isPrimary
      ? "var(--sw-accent-fg)"
      : hovered
        ? "var(--sw-accent)"
        : "var(--sw-text)",
    background: isPrimary
      ? hovered
        ? "var(--sw-accent-strong)"
        : "var(--sw-accent)"
      : hovered
        ? "var(--sw-surface)"
        : "transparent",
    borderRadius: "var(--sw-radius)",
    transition: "background 0.12s, color 0.12s",
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.45 : 1,
    border: "none",
    outline: "none",
  }

  return (
    <button
      style={base}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={label}
    >
      <Icon />
      <span style={{ lineHeight: 1.2 }}>{label}</span>
    </button>
  )
}
