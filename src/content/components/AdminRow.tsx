/** @jsxImportSource preact */
import { useState } from "preact/hooks"
import type { PanelButtonConfig } from "@shared/types"
import { EditIcon, EyeIcon, EyeSlashIcon } from "./icons"

const swIconBtn: preact.JSX.CSSProperties = {
  background: "none",
  border: "none",
  padding: "2px",
  cursor: "pointer",
  color: "var(--sw-text-muted)",
  display: "flex",
  alignItems: "center",
  borderRadius: 4,
  flexShrink: 0,
}

interface AdminRowProps {
  id: string
  icon: () => preact.JSX.Element
  cfg: PanelButtonConfig
  isPrimary: boolean
  onLabelChange: (id: string, label: string) => void
  onVisibilityToggle: (id: string) => void
}

export function AdminRow({
  id,
  icon: Icon,
  cfg,
  isPrimary,
  onLabelChange,
  onVisibilityToggle,
}: AdminRowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(cfg.label)

  const commit = () => {
    const trimmed = draft.trim() || cfg.label
    setDraft(trimmed)
    onLabelChange(id, trimmed)
    setEditing(false)
  }

  return (
    <div
      data-id={id}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 8px",
        background: cfg.visible ? "var(--sw-surface)" : "rgba(0,0,0,0.04)",
        border: "1.5px solid var(--sw-surface-edge)",
        borderRadius: "var(--sw-radius)",
        opacity: cfg.visible ? 1 : 0.5,
        cursor: "grab",
      }}
    >
      <span
        style={{
          color: "var(--sw-text-muted)",
          fontSize: "0.75rem",
          flexShrink: 0,
        }}
      >
        ⠿
      </span>

      <span
        style={{
          flexShrink: 0,
          color: isPrimary ? "var(--sw-accent)" : "var(--sw-text)",
        }}
      >
        <Icon />
      </span>

      {editing ? (
        <input
          value={draft}
          autoFocus
          onInput={(e) => setDraft((e.target as HTMLInputElement).value)}
          onBlur={commit}
          onKeyDown={(e: KeyboardEvent) => {
            if (e.key === "Enter") commit()
            if (e.key === "Escape") setEditing(false)
          }}
          style={{
            flex: 1,
            fontSize: "12px",
            fontWeight: 600,
            minWidth: 0,
            border: "1.5px solid var(--sw-accent)",
            borderRadius: 5,
            padding: "2px 5px",
            outline: "none",
            background: "var(--sw-bg)",
            color: "var(--sw-text)",
          }}
        />
      ) : (
        <span
          style={{
            flex: 1,
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--sw-text)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
        >
          {cfg.label}
        </span>
      )}

      <button
        onClick={() => {
          setDraft(cfg.label)
          setEditing(true)
        }}
        title="Edit label"
        aria-label="Edit label"
        style={swIconBtn}
      >
        <EditIcon />
      </button>

      <button
        onClick={() => onVisibilityToggle(id)}
        title={cfg.visible ? "Hide button" : "Show button"}
        aria-label={cfg.visible ? "Hide button" : "Show button"}
        style={swIconBtn}
      >
        {cfg.visible ? <EyeIcon /> : <EyeSlashIcon />}
      </button>
    </div>
  )
}
