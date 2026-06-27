import { useState } from "react"

interface VolBtnProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled: boolean
  fullWidth?: boolean
  accent?: boolean // active/on state (e.g. Mute engaged)
}

export function VolBtn({
  icon,
  label,
  onClick,
  disabled,
  fullWidth = false,
  accent = false,
}: VolBtnProps) {
  const [hov, setHov] = useState(false)
  const [press, setPress] = useState(false)

  const bg = accent
    ? "var(--sw-accent-xlight)"
    : hov
      ? "var(--sw-accent-light)"
      : "var(--sw-bg)"
  const col = disabled
    ? "var(--sw-surface-edge-mid)"
    : accent || hov
      ? "var(--sw-accent)"
      : "var(--sw-text-muted)"
  const border = `1.5px solid ${accent || hov ? "var(--sw-accent-light)" : "var(--sw-surface-edge)"}`

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => {
        if (!disabled) setHov(true)
      }}
      onMouseLeave={() => {
        setHov(false)
        setPress(false)
      }}
      onMouseDown={() => {
        if (!disabled) setPress(true)
      }}
      onMouseUp={() => setPress(false)}
      style={{
        flex: fullWidth ? undefined : 1,
        width: fullWidth ? "100%" : undefined,
        minHeight: 30,
        height: "clamp(30px, 4.5vh, 56px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.38rem",
        fontFamily: "inherit",
        background: bg,
        color: col,
        border,
        borderRadius: "var(--sw-radius-sm)",
        cursor: disabled ? "default" : "pointer",
        transition:
          "background 0.12s, color 0.12s, border-color 0.12s, transform 0.1s",
        transform: press ? "scale(0.94)" : "scale(1)",
        lineHeight: 1,
      }}
    >
      <span
        data-tile-icon
        style={{
          display: "flex",
          alignItems: "center",
          lineHeight: 1,
          fontSize: "clamp(1.1rem, 2vh, 1.6rem)",
        }}
      >
        {icon}
      </span>
      <span style={{ fontSize: "clamp(1.1rem, 2vh, 1.5rem)", fontWeight: 700 }}>
        {label}
      </span>
    </button>
  )
}
