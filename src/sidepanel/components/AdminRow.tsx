import { useState } from "react"
import {
  ArrowLeftIcon,
  ArrowLineUpIcon,
  ArrowRightIcon,
  ArrowsClockwiseIcon,
  ArrowsDownUpIcon,
  ArrowsOutIcon,
  BookmarkSimpleIcon,
  DotsSixVerticalIcon,
  EyeIcon,
  EyeSlashIcon,
  HouseIcon,
  PencilSimpleIcon,
  SpeakerHighIcon,
  TextAaIcon,
  XCircleIcon,
} from "@phosphor-icons/react"
import type { PanelButtonConfig } from "@shared/types"

// Smaller variants for the admin drag list
const PHOSPHOR_SM: Record<string, React.ReactNode> = {
  home: <HouseIcon size={18} weight="bold" />,
  back: <ArrowLeftIcon size={18} weight="bold" />,
  forward: <ArrowRightIcon size={18} weight="bold" />,
  volume: <SpeakerHighIcon size={18} weight="bold" />,
  scroll: <ArrowsDownUpIcon size={18} weight="bold" />,
  scrollTop: <ArrowLineUpIcon size={18} weight="bold" />,
  zoom: <TextAaIcon size={18} weight="bold" />,
  save: <BookmarkSimpleIcon size={18} weight="bold" />,
  fullscreen: <ArrowsOutIcon size={18} weight="bold" />,
  refresh: <ArrowsClockwiseIcon size={18} weight="bold" />,
  exit: <XCircleIcon size={18} weight="bold" />,
}

const iconBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: 4,
  cursor: "pointer",
  color: "var(--sw-text-muted)",
  display: "flex",
  alignItems: "center",
  borderRadius: 4,
  flexShrink: 0,
}

interface AdminRowProps {
  id: string
  cfg: PanelButtonConfig
  isPrimary: boolean
  onLabelChange: (id: string, label: string) => void
  onVisibilityToggle: (id: string) => void
}

export function AdminRow({
  id,
  cfg,
  isPrimary,
  onLabelChange,
  onVisibilityToggle,
}: AdminRowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(cfg.label)

  const commit = () => {
    const val = draft.trim() || cfg.label
    setDraft(val)
    onLabelChange(id, val)
    setEditing(false)
  }

  return (
    <div
      data-id={id}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        background: cfg.visible ? "var(--sw-surface)" : "rgba(0,0,0,0.03)",
        border: "1.5px solid var(--sw-surface-edge)",
        borderRadius: "var(--sw-radius-sm)",
        opacity: cfg.visible ? 1 : 0.5,
        cursor: "grab",
      }}
    >
      <span
        style={{
          color: "var(--sw-text-subtle)",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
        }}
      >
        <DotsSixVerticalIcon size={16} weight="bold" />
      </span>

      <span
        style={{
          flexShrink: 0,
          color: isPrimary ? "var(--sw-accent)" : "var(--sw-text-muted)",
          display: "flex",
          alignItems: "center",
        }}
      >
        {PHOSPHOR_SM[id]}
      </span>

      {editing ? (
        <input
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit()
            if (e.key === "Escape") setEditing(false)
          }}
          style={{
            flex: 1,
            fontSize: 13,
            fontWeight: 600,
            minWidth: 0,
            border: "1.5px solid var(--sw-accent)",
            borderRadius: 5,
            padding: "2px 6px",
            outline: "none",
            background: "var(--sw-bg)",
            color: "var(--sw-text-muted)",
            fontFamily: "inherit",
          }}
        />
      ) : (
        <span
          style={{
            flex: 1,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--sw-text-muted)",
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
        style={iconBtnStyle}
      >
        <PencilSimpleIcon size={14} weight="bold" />
      </button>

      <button
        onClick={() => onVisibilityToggle(id)}
        title={cfg.visible ? "Hide" : "Show"}
        style={iconBtnStyle}
      >
        {cfg.visible ? (
          <EyeIcon size={14} weight="bold" />
        ) : (
          <EyeSlashIcon size={14} weight="bold" />
        )}
      </button>
    </div>
  )
}
