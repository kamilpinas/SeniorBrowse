import { useEffect, useState } from "react"
import {
  BookmarkSimpleIcon,
  ClipboardTextIcon,
  GlobeIcon,
  MagnifyingGlassIcon,
  TrashIcon,
} from "@phosphor-icons/react"
import { storage } from "@shared/storage"
import { MAX_LOG_AGE_DAYS } from "@shared/constants"
import type { ActivityLogEntry } from "@shared/types"
import type { ToastType } from "@shared/toast"
import { EmptyState, relativeTime } from "./shared"

const TYPE_ICON: Record<string, React.ReactNode> = {
  visit: <GlobeIcon size={16} color="var(--color-text-muted)" />,
  search: <MagnifyingGlassIcon size={16} color="var(--color-text-muted)" />,
  save: <BookmarkSimpleIcon size={16} color="var(--color-text-muted)" />,
}
const PAGE_SIZE = 50

export function ActivityLogTab({
  showToast,
}: {
  showToast: (msg: string, type?: ToastType) => void
}) {
  const [log, setLog] = useState<ActivityLogEntry[]>([])
  const [search, setSearch] = useState("")
  const [shown, setShown] = useState(PAGE_SIZE)
  const [confirmingClear, setConfirmingClear] = useState(false)

  useEffect(() => {
    storage.local
      .get("activityLog")
      .then((all) => setLog([...all].reverse()))
      .catch(() => {})
  }, [])

  const clearLog = async () => {
    await storage.local.set("activityLog", [])
    setLog([])
    setConfirmingClear(false)
    showToast("Activity log cleared")
  }

  if (log.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardTextIcon size={36} color="var(--color-text-muted)" />}
        text="No pages visited yet. Pages will appear here as browsing happens."
      />
    )
  }

  // Filter by search term across title + URL.
  const query = search.trim().toLowerCase()
  const filtered = query
    ? log.filter(
        (e) =>
          e.title.toLowerCase().includes(query) ||
          e.url.toLowerCase().includes(query),
      )
    : log
  const visible = filtered.slice(0, shown)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      {/* Search bar */}
      <div style={{ position: "relative", marginBottom: "0.25rem" }}>
        <span
          style={{
            position: "absolute",
            left: "0.65rem",
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
          }}
        >
          <MagnifyingGlassIcon size={14} color="var(--color-text-muted)" />
        </span>
        <input
          type="search"
          placeholder="Search pages…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShown(PAGE_SIZE) }}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "0.5rem 0.75rem 0.5rem 2rem",
            borderRadius: 8,
            border: "1.5px solid var(--color-surface-edge)",
            background: "var(--color-surface)",
            color: "var(--color-text)",
            fontSize: "0.875rem",
            fontFamily: "inherit",
          }}
        />
      </div>

      {/* Retention note + manual clear — entries auto-expire after
          MAX_LOG_AGE_DAYS, but the caregiver can also clear everything now. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
          marginBottom: "0.25rem",
        }}
      >
        <span style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
          Kept for {MAX_LOG_AGE_DAYS} days, then removed automatically.
        </span>
        {confirmingClear ? (
          <span style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => void clearLog()}
              style={{
                padding: "0.3rem 0.6rem",
                borderRadius: 8,
                border: "1.5px solid var(--color-danger)",
                background: "var(--color-danger-light)",
                color: "var(--color-danger)",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Confirm clear
            </button>
            <button
              type="button"
              onClick={() => setConfirmingClear(false)}
              style={{
                padding: "0.3rem 0.6rem",
                borderRadius: 8,
                border: "1.5px solid var(--color-surface-edge)",
                background: "transparent",
                color: "var(--color-text-muted)",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingClear(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              padding: "0.3rem 0.6rem",
              borderRadius: 8,
              border: "1.5px solid var(--color-surface-edge)",
              background: "transparent",
              color: "var(--color-text-muted)",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              flexShrink: 0,
            }}
          >
            <TrashIcon size={13} /> Clear log
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <p style={{ textAlign: "center", color: "var(--color-text-muted)", fontSize: "0.9rem", padding: "1.5rem 0" }}>
          No results for "{search}"
        </p>
      )}

      {visible.map((entry, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.6rem",
            padding: "0.55rem 0.75rem",
            borderRadius: 8,
            background: i % 2 === 0 ? "transparent" : "var(--color-surface)",
          }}
        >
          <span style={{ display: "flex", flexShrink: 0, marginTop: 1 }}>
            {TYPE_ICON[entry.type] ?? (
              <GlobeIcon size={16} color="var(--color-text-muted)" />
            )}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "0.88rem",
                fontWeight: 600,
                color: "var(--color-text)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {entry.title}
            </div>
            <div
              style={{
                fontSize: "0.78rem",
                color: "var(--color-text-muted)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {/* Show just the domain — raw URLs are meaningless to seniors */}
              {(() => { try { return new URL(entry.url).hostname.replace(/^www\./, "") } catch { return entry.url } })()}
            </div>
          </div>
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--color-text-muted)",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            {relativeTime(entry.visitedAt)}
          </span>
        </div>
      ))}

      {shown < filtered.length && (
        <button
          type="button"
          onClick={() => setShown((n) => n + PAGE_SIZE)}
          style={{
            marginTop: "0.5rem",
            padding: "0.5rem",
            borderRadius: 8,
            border: "1.5px solid var(--color-surface-edge)",
            background: "transparent",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
            color: "var(--color-text-muted)",
          }}
        >
          Show {Math.min(PAGE_SIZE, filtered.length - shown)} more (of{" "}
          {filtered.length - shown} remaining)
        </button>
      )}
    </div>
  )
}
