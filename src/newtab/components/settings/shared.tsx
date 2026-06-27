function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
      <span
        style={{
          fontWeight: 600,
          fontSize: "0.88rem",
          color: "var(--color-text-muted)",
          textTransform: "uppercase" as const,
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  )
}

const textInput: React.CSSProperties = {
  padding: "0.65rem 0.9rem",
  borderRadius: 10,
  border: "1.5px solid var(--color-surface-edge)",
  background: "var(--color-surface-raised)",
  fontSize: "1rem",
  fontFamily: "inherit",
  color: "var(--color-text)",
  width: "100%",
  transition: "border-color 0.15s",
}

const textArea: React.CSSProperties = {
  ...textInput,
  fontFamily: "inherit",
  resize: "vertical" as const,
  minHeight: 90,
}

function Spinner() {
  return (
    <div
      style={{
        textAlign: "center" as const,
        padding: "2.5rem",
        color: "var(--color-text-muted)",
        fontSize: "0.9rem",
      }}
    >
      Loading…
    </div>
  )
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div
      style={{
        textAlign: "center" as const,
        padding: "3rem 1.5rem",
        color: "var(--color-text-muted)",
        background: "var(--color-surface)",
        borderRadius: "var(--radius-md)",
        border: "1.5px solid var(--color-surface-edge)",
      }}
    >
      <div
        style={{
          marginBottom: "0.75rem",
          display: "flex",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.55 }}>{text}</p>
    </div>
  )
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export { Field, textInput, textArea, Spinner, EmptyState, relativeTime }
