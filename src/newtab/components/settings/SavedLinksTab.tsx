import { useEffect, useState } from "react"
import {
  BookmarkSimpleIcon,
  CheckIcon,
  PlusIcon,
  XIcon,
} from "@phosphor-icons/react"
import { storage } from "@shared/storage"
import type { SavedLink, Shortcut, ShortcutSize } from "@shared/types"
import { EmptyState, relativeTime } from "./shared"

function smallBtn(bg: string, color: string): React.CSSProperties {
  return {
    padding: "0 1rem",
    minHeight: 44,
    fontSize: "0.85rem",
    fontWeight: 600,
    borderRadius: 8,
    border: "1.5px solid var(--color-surface-edge)",
    background: bg,
    color,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.3rem",
  }
}

export function SavedLinksTab() {
  const [links, setLinks] = useState<SavedLink[]>([])
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([])
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  const sortLinks = (all: SavedLink[]) =>
    [...all].sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
    )

  useEffect(() => {
    Promise.all([
      storage.local.get("savedLinks"),
      storage.local.get("shortcuts"),
    ])
      .then(([all, allShortcuts]) => {
        setLinks(sortLinks(all))
        setShortcuts(allShortcuts)
      })
      .catch(() => {})

    // Re-sort live when the side panel saves a new page while this tab
    // is open (chrome.storage.onChanged fires across extension contexts).
    const handleChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area !== "local") return
      if (changes["savedLinks"]?.newValue) {
        setLinks(sortLinks(changes["savedLinks"].newValue as SavedLink[]))
      }
      if (changes["shortcuts"]?.newValue) {
        setShortcuts(changes["shortcuts"].newValue as Shortcut[])
      }
    }
    chrome.storage.onChanged.addListener(handleChange)
    return () => chrome.storage.onChanged.removeListener(handleChange)
  }, [])

  const handleDelete = async (id: string) => {
    const next = links.filter((l) => l.id !== id)
    setLinks(next)
    await storage.local.set("savedLinks", next)
    setConfirmId(null)
  }

  // Returns true if this URL's hostname is already a shortcut on the home screen.
  const isAlreadyShortcut = (url: string): boolean => {
    try {
      const hostname = new URL(url).hostname
      return shortcuts.some((sc) => {
        try {
          return new URL(sc.url).hostname === hostname
        } catch {
          return false
        }
      })
    } catch {
      return false
    }
  }

  const handleAddShortcut = async (link: SavedLink) => {
    try {
      const hostname = new URL(link.url).hostname
      const iconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`
      const [config, existing] = await Promise.all([
        storage.local.get("config"),
        storage.local.get("shortcuts"),
      ])
      const maxPos = existing.reduce(
        (m: number, sc: Shortcut) => Math.max(m, sc.position),
        -1,
      )
      const sc: Shortcut = {
        id: crypto.randomUUID(),
        url: link.url,
        label: link.title || hostname.replace(/^www\./, ""),
        iconUrl,
        position: maxPos + 1,
        size: (config.shortcutSize as ShortcutSize) ?? "medium",
      }
      const next = [...existing, sc]
      await storage.local.set("shortcuts", next)
      setShortcuts(next)
      setAddedIds((prev) => new Set([...prev, link.id]))
    } catch {
      /* ignore */
    }
  }

  if (links.length === 0) {
    return (
      <EmptyState
        icon={<BookmarkSimpleIcon size={36} color="var(--color-text-muted)" />}
        text="No saved pages yet. When you find a page you'd like to come back to, the helper panel can save it for you."
      />
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {links.map((link) => {
        const alreadyAdded =
          addedIds.has(link.id) || isAlreadyShortcut(link.url)
        return (
          <div
            key={link.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.7rem 0.9rem",
              borderRadius: 10,
              background: "var(--color-surface)",
              border: "1.5px solid var(--color-surface-edge)",
            }}
          >
            {/* Page info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  color: "var(--color-text)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {link.title || link.url}
              </div>
              <div
                style={{
                  fontSize: "0.78rem",
                  color: "var(--color-text-muted)",
                  marginTop: 2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  {link.url}
                </a>
                {" · "}
                {relativeTime(link.savedAt)}
              </div>
            </div>

            {/* Add-to-home button */}
            <button
              type="button"
              onClick={() => {
                if (!alreadyAdded) void handleAddShortcut(link)
              }}
              disabled={alreadyAdded}
              title={
                alreadyAdded
                  ? "Already on home screen"
                  : "Add as shortcut on home screen"
              }
              style={{
                ...smallBtn(
                  alreadyAdded ? "transparent" : "var(--color-bg)",
                  alreadyAdded
                    ? "var(--color-text-muted)"
                    : "var(--color-text)",
                ),
                flexShrink: 0,
                opacity: alreadyAdded ? 0.6 : 1,
              }}
            >
              {alreadyAdded ? (
                <>
                  <CheckIcon size={12} /> Added
                </>
              ) : (
                <>
                  <PlusIcon size={12} /> Shortcut
                </>
              )}
            </button>

            {/* Delete / confirm */}
            {confirmId === link.id ? (
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button
                  onClick={() => void handleDelete(link.id)}
                  style={smallBtn("var(--color-accent)", "#fff")}
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmId(null)}
                  style={smallBtn("transparent", "var(--color-text-muted)")}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmId(link.id)}
                aria-label={`Delete ${link.title}`}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-text-muted)",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 44,
                  minHeight: 44,
                  borderRadius: 8,
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-text)" }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-muted)" }}
              >
                <XIcon size={16} weight="bold" />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
