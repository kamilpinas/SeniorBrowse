import { useRef } from "react"
import { useFocusTrap } from "@shared/useFocusTrap"

// Uses --sw-* tokens (sidepanel namespace).
// Focus trap so Tab can't escape; Cancel is first → default focus target.

export function CloseBrowserConfirm({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref)

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10300,
        background: "rgba(42,38,32,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="close-confirm-title"
        style={{
          background: "var(--sw-surface-raised)",
          border: "1.5px solid var(--sw-surface-edge)",
          borderRadius: "var(--sw-radius-lg)",
          padding: "1.75rem 1.5rem",
          width: "100%",
          maxWidth: 280,
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          textAlign: "center",
        }}
      >
        <p
          id="close-confirm-title"
          style={{
            margin: 0,
            fontSize: "1.05rem",
            fontWeight: 700,
            color: "var(--sw-text)",
            lineHeight: 1.4,
          }}
        >
          Close the whole browser?
        </p>
        <p
          style={{
            margin: 0,
            fontSize: "0.875rem",
            color: "var(--sw-text-muted)",
            lineHeight: 1.5,
          }}
        >
          This will close Chrome completely.
        </p>
        {/* Cancel first in DOM — receives auto-focus, safe default */}
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "0.65rem",
              background: "transparent",
              color: "var(--sw-text-muted)",
              border: "1.5px solid var(--sw-surface-edge)",
              borderRadius: "var(--sw-radius)",
              fontWeight: 600,
              fontSize: "0.9rem",
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: "0.75rem",
              background: "var(--sw-danger)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--sw-radius)",
              fontWeight: 700,
              fontSize: "0.95rem",
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            Yes, close browser
          </button>
        </div>
      </div>
    </div>
  )
}
