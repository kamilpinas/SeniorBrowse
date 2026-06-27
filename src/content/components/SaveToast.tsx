/** @jsxImportSource preact */

export function SaveToast({ message }: { message: string }) {
  return (
    <div
      style={{
        margin: "0 8px 4px",
        padding: "10px 12px",
        background: "var(--sw-surface)",
        border: "1.5px solid var(--sw-surface-edge)",
        borderRadius: "var(--sw-radius)",
        fontSize: "16px",
        lineHeight: 1.4,
        color: "var(--sw-text)",
      }}
    >
      {message}
    </div>
  )
}
