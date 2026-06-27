import { useEffect, useRef } from "react"
import { useFocusTrap } from "@shared/useFocusTrap"
import type { Shortcut } from "@shared/types"
import { ShortcutIcon } from "./ShortcutIcon"

// Centred overlay so the senior or caregiver can't miss it.

interface DeleteModalProps {
  shortcut: Shortcut
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmModal({
  shortcut,
  onConfirm,
  onCancel,
}: DeleteModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  useFocusTrap(modalRef)

  // Close on backdrop click
  const onBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onCancel()
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onCancel])

  return (
    <div
      onMouseDown={onBackdrop}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10100,
        background: "rgba(42,38,32,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-confirm-title"
        style={{
          background: "var(--color-bg)",
          border: "1.5px solid var(--color-surface-edge)",
          borderRadius: "var(--radius-lg)",
          padding: "2.25rem 2rem 2rem",
          maxWidth: 400,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 12px 48px rgba(42,38,32,0.28)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.25rem",
        }}
      >
        {/* Preview of what's being deleted */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "var(--color-surface)",
            border: "1.5px solid var(--color-surface-edge)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ShortcutIcon shortcut={shortcut} size="large" />
        </div>

        <div>
          <h2
            id="delete-confirm-title"
            style={{
              margin: "0 0 0.4rem",
              fontSize: "1.25rem",
              fontWeight: 800,
              color: "var(--color-text)",
            }}
          >
            Remove "{shortcut.label}"?
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: "0.95rem",
              color: "var(--color-text-muted)",
              lineHeight: 1.5,
            }}
          >
            You can undo this for a few seconds after removing.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", width: "100%" }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "0.85rem",
              background: "transparent",
              border: "1.5px solid var(--color-surface-edge)",
              borderRadius: "var(--radius-md)",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
              color: "var(--color-text-muted)",
              fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: "0.85rem",
              background: "var(--color-accent)",
              border: "none",
              borderRadius: "var(--radius-md)",
              fontSize: "1rem",
              fontWeight: 700,
              cursor: "pointer",
              color: "#fff",
              fontFamily: "inherit",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--color-accent-strong)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--color-accent)"
            }}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}
