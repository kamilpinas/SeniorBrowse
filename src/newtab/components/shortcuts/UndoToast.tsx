export function UndoToast({ label, onUndo }: { label: string; onUndo: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: "1.5rem",
        left: "50%",
        transform: "translateX(-50%)",
        background: "var(--color-text)",
        color: "#f7f1e6",
        borderRadius: 10,
        padding: "0.7rem 1.2rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        fontSize: "0.95rem",
        fontWeight: 500,
        boxShadow: "0 4px 16px rgba(0,0,0,0.22)",
        zIndex: 10001,
        whiteSpace: "nowrap",
      }}
    >
      <span>"{label}" removed</span>
      <button
        onClick={onUndo}
        style={{
          background: "var(--color-accent)",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          padding: "0.25rem 0.7rem",
          fontWeight: 700,
          fontSize: "0.875rem",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        Undo
      </button>
    </div>
  )
}
