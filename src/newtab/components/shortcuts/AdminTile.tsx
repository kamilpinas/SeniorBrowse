import { useEffect, useRef, useState } from "react"
import { DotsSixVerticalIcon, PencilSimpleIcon, XIcon } from "@phosphor-icons/react"
import type { Shortcut, ShortcutSize } from "@shared/types"
import { TILE_CFG } from "./shared"
import { ShortcutIcon } from "./ShortcutIcon"

// Delete button triggers a centred confirmation modal (lifted to grid).
// Size is now global (SizeControl bar above the grid) — no per-tile stepper.

interface AdminTileProps {
  shortcut: Shortcut
  size: ShortcutSize
  onRequestDelete: (shortcut: Shortcut) => void
  onRename: (id: string, newLabel: string) => void
}

export function AdminTile({ shortcut, size, onRequestDelete, onRename }: AdminTileProps) {
  const cfg = TILE_CFG[size]
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const editInputRef = useRef<HTMLInputElement>(null)

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDraft(shortcut.label)
    setIsEditing(true)
  }

  const confirmEdit = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== shortcut.label) onRename(shortcut.id, trimmed)
    setIsEditing(false)
  }

  const cancelEdit = () => setIsEditing(false)

  useEffect(() => {
    if (isEditing) {
      editInputRef.current?.focus()
      editInputRef.current?.select()
    }
  }, [isEditing])

  return (
    <div
      data-id={shortcut.id}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: cfg.gap,
        padding: cfg.padding,
        // Delete button is absolute at top:4, height:32 → bottom edge y=36.
        // Without this top-pad override, the icon starts inside the
        // button's space and visually overlaps it (especially on
        // small / medium sizes). Reserve 2.75rem (44px) so the icon
        // always sits clear of the button with a 4px buffer.
        paddingTop: "2.75rem",
        paddingBottom: "1.75rem", // room for the rename button at the bottom
        background: "var(--color-surface)",
        border: "1.5px solid var(--color-surface-edge)",
        borderRadius: "var(--radius-md)",
        position: "relative",
        cursor: "grab",
        minHeight: 80,
      }}
    >
      {/* Drag hint */}
      <span
        style={{
          position: "absolute",
          top: 5,
          left: 8,
          fontSize: "0.7rem",
          color: "var(--color-text-muted)",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        <DotsSixVerticalIcon size={14} color="var(--color-text-muted)" />
      </span>

      {/* Delete button */}
      <button
        onClick={() => onRequestDelete(shortcut)}
        aria-label={`Remove ${shortcut.label}`}
        style={{
          position: "absolute",
          top: 4,
          right: 4,
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: "1.5px solid var(--color-surface-edge)",
          background: "var(--color-bg)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.85rem",
          fontWeight: 700,
          lineHeight: 1,
          color: "var(--color-text-muted)",
          padding: 0,
          transition: "background 0.12s, border-color 0.12s, color 0.12s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--color-danger-light)"
          e.currentTarget.style.borderColor = "var(--color-danger)"
          e.currentTarget.style.color = "var(--color-danger)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--color-bg)"
          e.currentTarget.style.borderColor = "var(--color-surface-edge)"
          e.currentTarget.style.color = "var(--color-text-muted)"
        }}
      >
        <XIcon size={10} weight="bold" />
      </button>

      <ShortcutIcon shortcut={shortcut} size={size} />

      {isEditing ? (
        <input
          ref={editInputRef}
          value={draft}
          onChange={(e) => setDraft((e.target as HTMLInputElement).value)}
          onBlur={confirmEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); confirmEdit() }
            if (e.key === "Escape") cancelEdit()
          }}
          onClick={(e) => e.stopPropagation()}
          style={{
            fontSize: cfg.fontSize,
            fontWeight: 500,
            color: "var(--color-text)",
            lineHeight: 1.3,
            width: "100%",
            border: "1.5px solid var(--color-accent)",
            borderRadius: 6,
            padding: "0.2rem 0.4rem",
            background: "var(--color-bg)",
            textAlign: "center",
            fontFamily: "inherit",
            outline: "none",
          }}
        />
      ) : (
        <span
          style={{
            fontSize: cfg.fontSize,
            fontWeight: 500,
            color: "var(--color-text)",
            lineHeight: 1.3,
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {shortcut.label}
        </span>
      )}

      {/* Rename / edit button */}
      <button
        onClick={startEdit}
        aria-label={`Rename ${shortcut.label}`}
        title="Rename"
        style={{
          position: "absolute",
          bottom: 4,
          right: 4,
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: "1.5px solid var(--color-surface-edge)",
          background: "var(--color-bg)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          color: "var(--color-text-muted)",
          transition: "background 0.12s, border-color 0.12s, color 0.12s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--color-accent-light)"
          e.currentTarget.style.borderColor = "var(--color-accent)"
          e.currentTarget.style.color = "var(--color-accent)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--color-bg)"
          e.currentTarget.style.borderColor = "var(--color-surface-edge)"
          e.currentTarget.style.color = "var(--color-text-muted)"
        }}
      >
        <PencilSimpleIcon size={10} weight="bold" />
      </button>
    </div>
  )
}
