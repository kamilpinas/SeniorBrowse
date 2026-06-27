// Style primitives shared by ≥2 step components in this wizard.

export const heading: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 800,
  color: "var(--color-text)",
  margin: 0,
  lineHeight: 1.25,
}

export const body: React.CSSProperties = {
  fontSize: "1rem",
  color: "var(--color-text-muted)",
  margin: 0,
  lineHeight: 1.6,
}

export const primaryBtn: React.CSSProperties = {
  padding: "0.75rem 1.6rem",
  background: "var(--color-accent)",
  color: "#fff",
  border: "none",
  borderRadius: "var(--radius-md)",
  fontSize: "1rem",
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.4rem",
  transition:
    "background 0.15s cubic-bezier(.4,0,.2,1), transform 0.15s cubic-bezier(.4,0,.2,1), border-color 0.15s",
}

export const inputStyle: React.CSSProperties = {
  padding: "0.6rem 0.85rem",
  borderRadius: 10,
  border: "1.5px solid var(--color-surface-edge)",
  background: "var(--color-surface)",
  fontSize: "0.9rem",
  fontFamily: "inherit",
  color: "var(--color-text)",
  outline: "none",
  width: "100%",
}
