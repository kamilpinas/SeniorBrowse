// A-03: drag-to-reorder  A-04: resize  A-05: add shortcut  A-06: delete + undo

import { useEffect, useRef, useState } from "react"
import { useFocusTrap } from "@shared/useFocusTrap"
import {
  BookIcon,
  ChatCircleIcon,
  CheckIcon,
  DotsSixVerticalIcon,
  EnvelopeIcon,
  FilmStripIcon,
  GlobeIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  NewspaperIcon,
  PencilSimpleIcon,
  PlayIcon,
  PlusIcon,
  ShoppingCartIcon,
  UsersIcon,
  XIcon,
} from "@phosphor-icons/react"
import Sortable from "sortablejs"
import { storage } from "@shared/storage"
import { UNDO_TOAST_MS } from "@shared/constants"
import { Mark } from "@shared/Mark"
import type { ActivityLogEntry, Shortcut, ShortcutSize } from "@shared/types"

// ── Tile size config ──────────────────────────────────────────────────────────

const SIZES: ShortcutSize[] = ["small", "medium", "large", "xl", "xl2"]

const TILE_CFG: Record<
  ShortcutSize,
  { iconSize: number; fontSize: string; padding: string; gap: string }
> = {
  small: {
    iconSize: 40,
    fontSize: "1rem",
    padding: "0.5rem 0.5rem",
    gap: "0.5rem",
  },
  medium: {
    iconSize: 52,
    fontSize: "1rem",
    padding: "1.25rem 1rem",
    gap: "0.625rem",
  },
  large: {
    iconSize: 64,
    fontSize: "1.125rem",
    padding: "1.5rem 1.25rem",
    gap: "0.75rem",
  },
  xl: {
    iconSize: 76,
    fontSize: "1.25rem",
    padding: "1.5rem 1.25rem",
    gap: "0.75rem",
  },
  xl2: {
    iconSize: 100,
    fontSize: "1.25rem",
    padding: "1.5rem 1.25rem",
    gap: "0.75rem",
  },
}

// Human-readable size labels for the SizeControl bar.
const SIZE_NAMES: Record<ShortcutSize, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  xl: "X-Large",
  xl2: "XX-Large",
}

// ── Avatar helpers ────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  "#9c3520",   // updated to match current accent
  "#2a6dc2",
  "#2a9c6d",
  "#8c4cc2",
  "#c2872a",
  "#c24a4a",
  "#2a8cb0",
  "#6d7c2a",
]

function getAvatarColor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length] ?? "#9c3520"
}

// ── Icon ─────────────────────────────────────────────────────────────────────

function ShortcutIcon({
  shortcut,
  size = shortcut.size,
}: {
  shortcut: Shortcut
  size?: ShortcutSize
}) {
  const [failed, setFailed] = useState(false)
  const { iconSize } = TILE_CFG[size]

  if (shortcut.iconUrl && !failed) {
    return (
      <img
        src={shortcut.iconUrl}
        alt=""
        width={iconSize}
        height={iconSize}
        onError={() => setFailed(true)}
        style={{ objectFit: "contain", display: "block", borderRadius: 4 }}
      />
    )
  }

  const letter = (shortcut.label.trim()[0] ?? "?").toUpperCase()
  const bg = getAvatarColor(shortcut.url || shortcut.label)

  return (
    <div
      aria-hidden="true"
      style={{
        width: iconSize,
        height: iconSize,
        borderRadius: "50%",
        background: bg,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.round(iconSize * 0.42),
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {letter}
    </div>
  )
}

// ── View tile ─────────────────────────────────────────────────────────────────

function ViewTile({
  shortcut,
  size,
}: {
  shortcut: Shortcut
  size: ShortcutSize
}) {
  const cfg = TILE_CFG[size]
  const [hovered, setHovered] = useState(false)

  return (
    <a
      href={shortcut.url}
      target="_self"
      aria-label={shortcut.label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: cfg.gap,
        padding: cfg.padding,
        background: hovered ? "var(--color-surface)" : "transparent",
        border: `1.5px solid ${hovered ? "var(--color-surface-edge)" : "transparent"}`,
        borderRadius: "var(--radius-md)",
        boxShadow: hovered ? "var(--shadow-soft)" : "none",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        transition:
          "background 0.2s cubic-bezier(0.22,1,0.36,1), border-color 0.2s cubic-bezier(0.22,1,0.36,1), box-shadow 0.2s cubic-bezier(0.22,1,0.36,1), transform 0.22s cubic-bezier(0.22,1,0.36,1)",
        textDecoration: "none",
        cursor: "pointer",
        minHeight: 80,
        // A8: let the global :focus-visible rule supply the outline —
        // don't suppress it with outline:none then manually reinstate it.
      }}
    >
      <ShortcutIcon shortcut={shortcut} size={size} />
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
    </a>
  )
}

// ── Admin tile ────────────────────────────────────────────────────────────────
// A-06: delete button triggers a centred confirmation modal (lifted to grid).
// Size is now global (SizeControl bar above the grid) — no per-tile stepper.

interface AdminTileProps {
  shortcut: Shortcut
  size: ShortcutSize
  onRequestDelete: (shortcut: Shortcut) => void
  onRename: (id: string, newLabel: string) => void
}

function AdminTile({ shortcut, size, onRequestDelete, onRename }: AdminTileProps) {
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

function stepBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    borderRadius: 8,
    border: "1.5px solid var(--color-surface-edge)",
    background: disabled ? "transparent" : "var(--color-bg)",
    cursor: disabled ? "default" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.1rem",
    fontWeight: 700,
    lineHeight: 1,
    padding: 0,
    color: disabled ? "var(--color-surface-edge)" : "var(--color-text-muted)",
    transition: "background 0.12s, border-color 0.12s",
  }
}

// ── Global size control bar (shown in admin mode above the grid) ──────────────

interface SizeControlProps {
  size: ShortcutSize
  onChange: (size: ShortcutSize) => void
}

function SizeControl({ size, onChange }: SizeControlProps) {
  const idx = SIZES.indexOf(size)
  const canShrink = idx > 0
  const canGrow = idx < SIZES.length - 1

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.6rem",
        padding: "0.45rem 0.85rem",
        background: "var(--color-surface)",
        border: "1.5px solid var(--color-surface-edge)",
        borderRadius: "var(--radius-md)",
        alignSelf: "flex-start",
        userSelect: "none",
      }}
    >
      {/* Aa icon — visual cue that this is a size control */}
      <span
        style={{
          fontSize: "1rem",
          fontWeight: 700,
          color: "var(--color-text-muted)",
          lineHeight: 1,
          marginRight: 2,
        }}
        aria-hidden="true"
      >
        Aa
      </span>

      <span
        style={{
          fontSize: "0.8rem",
          fontWeight: 600,
          color: "var(--color-text-muted)",
          whiteSpace: "nowrap",
        }}
      >
        Shortcut size
      </span>

      <button
        type="button"
        onClick={() => canShrink && onChange(SIZES[idx - 1]!)}
        disabled={!canShrink}
        title="Make shortcuts smaller"
        style={stepBtnStyle(!canShrink)}
        onMouseEnter={(e) => {
          if (canShrink) {
            e.currentTarget.style.background = "var(--color-surface-raised)"
            e.currentTarget.style.borderColor = "var(--color-accent-light)"
          }
        }}
        onMouseLeave={(e) => {
          if (canShrink) {
            e.currentTarget.style.background = "var(--color-bg)"
            e.currentTarget.style.borderColor = "var(--color-surface-edge)"
          }
        }}
      >
        −
      </button>

      <span
        style={{
          fontSize: "0.875rem",
          fontWeight: 700,
          color: "var(--color-text)",
          minWidth: 72,
          textAlign: "center",
        }}
      >
        {SIZE_NAMES[size]}
      </span>

      <button
        type="button"
        onClick={() => canGrow && onChange(SIZES[idx + 1]!)}
        disabled={!canGrow}
        title="Make shortcuts larger"
        style={stepBtnStyle(!canGrow)}
        onMouseEnter={(e) => {
          if (canGrow) {
            e.currentTarget.style.background = "var(--color-surface-raised)"
            e.currentTarget.style.borderColor = "var(--color-accent-light)"
          }
        }}
        onMouseLeave={(e) => {
          if (canGrow) {
            e.currentTarget.style.background = "var(--color-bg)"
            e.currentTarget.style.borderColor = "var(--color-surface-edge)"
          }
        }}
      >
        +
      </button>
    </div>
  )
}

// ── Delete confirmation modal (A-06) ──────────────────────────────────────────
// Centred overlay so the senior or caregiver can't miss it.

interface DeleteModalProps {
  shortcut: Shortcut
  onConfirm: () => void
  onCancel: () => void
}

function DeleteConfirmModal({
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

// ── Popular sites (quick-add chips) ──────────────────────────────────────────

interface QuickSite {
  label: string
  url: string
  icon: React.ReactNode
}

const POPULAR_SITES: QuickSite[] = [
  {
    label: "Google",
    url: "https://google.com",
    icon: <MagnifyingGlassIcon size={15} />,
  },
  {
    label: "YouTube",
    url: "https://youtube.com",
    icon: <PlayIcon size={15} weight="fill" />,
  },
  {
    label: "Gmail",
    url: "https://gmail.com",
    icon: <EnvelopeIcon size={15} />,
  },
  {
    label: "Facebook",
    url: "https://facebook.com",
    icon: <UsersIcon size={15} />,
  },
  {
    label: "Wikipedia",
    url: "https://en.wikipedia.org",
    icon: <BookIcon size={15} />,
  },
  {
    label: "Amazon",
    url: "https://amazon.com",
    icon: <ShoppingCartIcon size={15} />,
  },
  {
    label: "BBC News",
    url: "https://bbc.com/news",
    icon: <NewspaperIcon size={15} />,
  },
  {
    label: "WhatsApp",
    url: "https://web.whatsapp.com",
    icon: <ChatCircleIcon size={15} weight="fill" />,
  },
  {
    label: "Netflix",
    url: "https://netflix.com",
    icon: <FilmStripIcon size={15} />,
  },
  {
    label: "Maps",
    url: "https://maps.google.com",
    icon: <MapPinIcon size={15} weight="fill" />,
  },
]

// ── Add shortcut form (A-05) ──────────────────────────────────────────────────

interface AddFormProps {
  existingUrls: string[] // hostnames already in the grid — used to grey out chips
  onAdd: (url: string, label: string, iconUrl: string) => void
  onCancel: () => void
}

interface VisitedSite {
  label: string
  url: string
  iconUrl: string
}

function AddShortcutForm({ existingUrls, onAdd, onCancel }: AddFormProps) {
  const [url, setUrl] = useState("")
  const [label, setLabel] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  const [recentSites, setRecentSites] = useState<VisitedSite[]>([])
  const [selectedChipUrl, setSelectedChipUrl] = useState<string | null>(null)
  const [prefillIconUrl, setPrefillIconUrl] = useState("")

  const formRef = useRef<HTMLDivElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const labelInputRef = useRef<HTMLInputElement>(null)

  // C-04: trap Tab/Shift+Tab inside the form; keep the URL input's own auto-focus
  useFocusTrap(formRef, { autoFocus: false })

  // Focus the URL field on mount
  useEffect(() => {
    urlInputRef.current?.focus()
  }, [])

  // Load most-visited sites from activity log
  useEffect(() => {
    storage.local
      .get("activityLog")
      .then((log: ActivityLogEntry[]) => {
        const counts = new Map<
          string,
          { count: number; url: string; title: string }
        >()
        for (const entry of log) {
          if (entry.type !== "visit") continue
          try {
            const host = new URL(entry.url).hostname
            const prev = counts.get(host)
            if (prev) {
              prev.count++
            } else {
              counts.set(host, { count: 1, url: entry.url, title: entry.title })
            }
          } catch {
            /* skip malformed URLs */
          }
        }
        const top = [...counts.entries()]
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 6)
          .map(([host, data]) => ({
            label: data.title.trim() || host.replace(/^www\./, ""),
            url: data.url,
            iconUrl: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`,
          }))
        setRecentSites(top)
      })
      .catch(() => {})
  }, [])

  const derivedHostname = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "")
    } catch {
      return ""
    }
  })()

  const handleUrlBlur = () => {
    if (derivedHostname && !label) setLabel(derivedHostname)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr("")
    let fullUrl = url.trim()
    if (!fullUrl) {
      setErr("Please enter a website address.")
      return
    }
    if (!/^https?:\/\//.test(fullUrl)) fullUrl = `https://${fullUrl}`
    let hostname = ""
    try {
      hostname = new URL(fullUrl).hostname
    } catch {
      setErr("That doesn't look like a website address. Try something like youtube.com")
      return
    }
    setBusy(true)
    const finalLabel = label.trim() || hostname.replace(/^www\./, "")
    // Use the pre-fetched icon when the URL still matches the selected chip
    const iconUrl =
      prefillIconUrl && selectedChipUrl === fullUrl
        ? prefillIconUrl
        : `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`
    onAdd(fullUrl, finalLabel, iconUrl)
    setBusy(false)
  }

  // Pre-fill the form from a chip click — lets the caregiver rename before confirming
  const fillForm = (site: QuickSite | VisitedSite) => {
    try {
      const hostname = new URL(site.url).hostname
      const iconUrl =
        "iconUrl" in site
          ? site.iconUrl
          : `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`
      setUrl(site.url)
      setLabel(site.label)
      setPrefillIconUrl(iconUrl)
      setSelectedChipUrl(site.url)
      setErr("")
      // Focus the label field so the caregiver can rename immediately
      setTimeout(() => {
        labelInputRef.current?.focus()
        labelInputRef.current?.select()
      }, 0)
    } catch {
      /* ignore */
    }
  }

  const isExisting = (siteUrl: string) => {
    try {
      return existingUrls.includes(new URL(siteUrl).hostname)
    } catch {
      return false
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(42,38,32,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        ref={formRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-shortcut-title"
        style={{
          background: "var(--color-surface)",
          border: "1.5px solid var(--color-surface-edge)",
          borderRadius: "var(--radius-lg)",
          padding: "1.75rem",
          width: "100%",
          maxWidth: 520,
          maxHeight: "88vh",
          overflowY: "auto",
          boxShadow: "0 8px 40px rgba(42,38,32,0.22)",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        <h2
          id="add-shortcut-title"
          style={{
            margin: 0,
            fontSize: "1.1rem",
            fontWeight: 700,
            color: "var(--color-text)",
          }}
        >
          Add a shortcut
        </h2>

        {/* ── Popular sites ───────────────────────────────────────────────── */}
        <div>
          <p style={sectionLabel}>Popular sites — click to pre-fill, then rename if you like</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {POPULAR_SITES.map((site) => {
              const existing = isExisting(site.url)
              const selected = selectedChipUrl === site.url
              return (
                <button
                  key={site.url}
                  type="button"
                  disabled={existing}
                  onClick={() => !existing && fillForm(site)}
                  title={existing ? "Already added" : `Select ${site.label}`}
                  style={chipStyle(existing, selected)}
                  onMouseEnter={(e) => {
                    if (!existing && !selected) {
                      e.currentTarget.style.background = "var(--color-surface)"
                      e.currentTarget.style.borderColor =
                        "var(--color-accent-light)"
                      e.currentTarget.style.color = "var(--color-accent)"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!existing && !selected) {
                      e.currentTarget.style.background = "var(--color-bg)"
                      e.currentTarget.style.borderColor =
                        "var(--color-surface-edge)"
                      e.currentTarget.style.color = "var(--color-text)"
                    }
                  }}
                >
                  {site.icon}
                  <span>{site.label}</span>
                  {existing && (
                    <span
                      style={{
                        color: "var(--color-text-muted)",
                        display: "flex",
                      }}
                    >
                      <CheckIcon size={11} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Most visited ─────────────────────────────────────────────────── */}
        {recentSites.length > 0 && (
          <div>
            <p style={sectionLabel}>Most visited</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {recentSites.map((site) => {
                const existing = isExisting(site.url)
                const selected = selectedChipUrl === site.url
                return (
                  <button
                    key={site.url}
                    type="button"
                    disabled={existing}
                    onClick={() => !existing && fillForm(site)}
                    title={existing ? "Already added" : `Select ${site.label}`}
                    style={chipStyle(existing, selected)}
                    onMouseEnter={(e) => {
                      if (!existing && !selected) {
                        e.currentTarget.style.background =
                          "var(--color-surface)"
                        e.currentTarget.style.borderColor =
                          "var(--color-accent-light)"
                        e.currentTarget.style.color = "var(--color-accent)"
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!existing && !selected) {
                        e.currentTarget.style.background = "var(--color-bg)"
                        e.currentTarget.style.borderColor =
                          "var(--color-surface-edge)"
                        e.currentTarget.style.color = "var(--color-text)"
                      }
                    }}
                  >
                    <SiteFavicon src={site.iconUrl} />
                    <span
                      style={{
                        maxWidth: 120,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {site.label}
                    </span>
                    {existing && (
                      <span
                        style={{
                          color: "var(--color-text-muted)",
                          display: "flex",
                        }}
                      >
                        <CheckIcon size={11} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Divider ───────────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <div
            style={{
              flex: 1,
              height: 1,
              background: "var(--color-surface-edge)",
            }}
          />
          <span
            style={{
              fontSize: "0.78rem",
              color: "var(--color-text-muted)",
              fontWeight: 600,
            }}
          >
            or type a website address
          </span>
          <div
            style={{
              flex: 1,
              height: 1,
              background: "var(--color-surface-edge)",
            }}
          />
        </div>

        {/* ── Manual URL form ───────────────────────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}
        >
          <label style={labelStyle}>
            Website address
            <input
              ref={urlInputRef}
              type="text"
              value={url}
              onChange={(e) => {
                setUrl((e.target as HTMLInputElement).value)
                // Clear chip selection when user edits the URL manually
                if (selectedChipUrl) {
                  setSelectedChipUrl(null)
                  setPrefillIconUrl("")
                }
              }}
              onBlur={handleUrlBlur}
              placeholder="e.g. youtube.com"
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Name (you can change it)
            <input
              ref={labelInputRef}
              type="text"
              value={label}
              onChange={(e) => setLabel((e.target as HTMLInputElement).value)}
              placeholder={derivedHostname || "My shortcut"}
              style={inputStyle}
            />
          </label>

          {err && (
            <p
              style={{
                margin: 0,
                color: "var(--color-accent)",
                fontSize: "0.875rem",
              }}
            >
              {err}
            </p>
          )}

          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              justifyContent: "flex-end",
            }}
          >
            <button type="button" onClick={onCancel} style={secondaryBtn}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}
            >
              Add shortcut
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SiteFavicon({ src }: { src: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <GlobeIcon size={16} color="var(--color-text-muted)" />
  return (
    <img
      src={src}
      width={16}
      height={16}
      alt=""
      onError={() => setFailed(true)}
      style={{ borderRadius: 3, objectFit: "contain" }}
    />
  )
}

const sectionLabel: React.CSSProperties = {
  margin: "0 0 0.5rem",
  fontSize: "0.75rem",
  fontWeight: 700,
  color: "var(--color-text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
}

function chipStyle(disabled: boolean, selected = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    padding: "0.35rem 0.75rem",
    background: selected
      ? "var(--color-accent-light)"
      : disabled
        ? "transparent"
        : "var(--color-bg)",
    border: `1.5px solid ${selected ? "var(--color-accent)" : "var(--color-surface-edge)"}`,
    borderRadius: 20,
    fontSize: "0.875rem",
    fontWeight: 600,
    fontFamily: "inherit",
    cursor: disabled ? "default" : "pointer",
    color: selected
      ? "var(--color-accent)"
      : disabled
        ? "var(--color-text-muted)"
        : "var(--color-text)",
    opacity: disabled ? 0.55 : 1,
    transition: "background 0.12s, border-color 0.12s, color 0.12s",
  }
}

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.4rem",
  fontSize: "0.9rem",
  fontWeight: 600,
  color: "var(--color-text)",
}
const inputStyle: React.CSSProperties = {
  padding: "0.55rem 0.75rem",
  borderRadius: 8,
  border: "1.5px solid var(--color-surface-edge)",
  background: "var(--color-bg)",
  fontSize: "1rem",
  color: "var(--color-text)",
  outline: "none",
  width: "100%",
}
const primaryBtn: React.CSSProperties = {
  padding: "0.55rem 1.2rem",
  borderRadius: 10,
  border: "none",
  background: "var(--color-accent)",
  color: "#fff",
  fontSize: "0.95rem",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
}
const secondaryBtn: React.CSSProperties = {
  padding: "0.55rem 1.2rem",
  borderRadius: 10,
  border: "1.5px solid var(--color-surface-edge)",
  background: "transparent",
  fontSize: "0.95rem",
  fontWeight: 600,
  cursor: "pointer",
  color: "var(--color-text)",
  fontFamily: "inherit",
}

// ── Undo toast (A-06) ─────────────────────────────────────────────────────────

function UndoToast({ label, onUndo }: { label: string; onUndo: () => void }) {
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

// ── Grid ──────────────────────────────────────────────────────────────────────

interface Props {
  adminMode: boolean
}

interface UndoSnapshot {
  /** The deleted shortcut itself — used to re-insert, not to restore a whole snapshot. */
  deletedItem: Shortcut
  /** Original index in the list before deletion — re-insert here (clamped to current length). */
  deletedAt: number
  deletedLabel: string
  timer: ReturnType<typeof setTimeout>
}

export function ShortcutGrid({ adminMode }: Props) {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([])
  const [shortcutSize, setShortcutSize] = useState<ShortcutSize>("medium")
  const [loaded, setLoaded] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Shortcut | null>(null)
  const [undoSnap, setUndoSnap] = useState<UndoSnapshot | null>(null)

  const gridRef = useRef<HTMLDivElement>(null)
  const sortableRef = useRef<Sortable | null>(null)

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([storage.local.get("shortcuts"), storage.local.get("config")])
      .then(([all, config]) => {
        setShortcuts([...all].sort((a, b) => a.position - b.position))
        setShortcutSize((config?.shortcutSize as ShortcutSize) ?? "medium")
      })
      .catch(() => setShortcuts([]))
      .finally(() => setLoaded(true))
  }, [])

  // ── Live sync — react immediately to any shortcuts change ─────────────────
  // This makes shortcuts added from the Settings modal (Saved Pages tab)
  // appear in the grid without a page reload.
  useEffect(() => {
    const onChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area !== "local" || !("shortcuts" in changes)) return
      const updated = (changes["shortcuts"]?.newValue as Shortcut[]) ?? []
      setShortcuts([...updated].sort((a, b) => a.position - b.position))
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  // ── SortableJS (A-03) ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!adminMode || !gridRef.current) {
      sortableRef.current?.destroy()
      sortableRef.current = null
      return
    }

    sortableRef.current = Sortable.create(gridRef.current, {
      animation: 150,
      dataIdAttr: "data-id",
      // Only elements with data-id (shortcut tiles) are sortable.
      // The "Add shortcut" button has no data-id, so it is ignored.
      draggable: "[data-id]",
      // Prevent ANY tile from being dragged past an element that lacks data-id.
      // This keeps the Add button locked to the very end during drags.
      onMove: (evt) => (evt.related as HTMLElement).hasAttribute("data-id"),
      onEnd: () => {
        const order = sortableRef.current!.toArray().filter(Boolean)
        setShortcuts((prev) => {
          const byId = new Map(prev.map((sc) => [sc.id, sc]))
          const next = order
            .map((id, idx) => {
              const sc = byId.get(id)
              return sc ? { ...sc, position: idx } : null
            })
            .filter((x): x is Shortcut => x !== null)
          void storage.local.set("shortcuts", next)
          return next
        })
      },
    })

    return () => {
      sortableRef.current?.destroy()
      sortableRef.current = null
    }
  }, [adminMode])

  // ── Global size change ────────────────────────────────────────────────────
  const handleSizeChange = async (size: ShortcutSize) => {
    setShortcutSize(size)
    // Use update() (deep-merge) instead of set() so concurrent writes to other
    // config keys are not silently overwritten (B-10).
    await storage.local.update("config", { shortcutSize: size })
  }

  // ── Delete + undo (A-06) ──────────────────────────────────────────────────
  const handleDelete = (id: string) => {
    const deletedAt = shortcuts.findIndex((sc) => sc.id === id)
    const target = shortcuts[deletedAt]
    if (!target || deletedAt === -1) return
    if (undoSnap) clearTimeout(undoSnap.timer)
    const next = shortcuts.filter((sc) => sc.id !== id)
    setShortcuts(next)
    void storage.local.set("shortcuts", next)
    const timer = setTimeout(() => setUndoSnap(null), UNDO_TOAST_MS)
    // Store only the deleted item + its position, NOT a full array snapshot.
    // This prevents undo from clobbering shortcuts added after the delete (DS-01).
    setUndoSnap({ deletedItem: target, deletedAt, deletedLabel: target.label, timer })
    setPendingDelete(null)
  }

  const handleUndo = async () => {
    if (!undoSnap) return
    clearTimeout(undoSnap.timer)
    // Re-read current shortcuts so we don't overwrite anything added since delete.
    const current = await storage.local.get("shortcuts")
    const insertAt = Math.min(undoSnap.deletedAt, current.length)
    const restored = [
      ...current.slice(0, insertAt),
      undoSnap.deletedItem,
      ...current.slice(insertAt),
    ]
    setShortcuts(restored)
    await storage.local.set("shortcuts", restored)
    setUndoSnap(null)
  }

  // ── Rename ────────────────────────────────────────────────────────────────
  const handleRename = async (id: string, newLabel: string) => {
    const next = shortcuts.map((sc) =>
      sc.id === id ? { ...sc, label: newLabel } : sc,
    )
    setShortcuts(next)
    await storage.local.set("shortcuts", next)
  }

  // ── Add (A-05) ────────────────────────────────────────────────────────────
  const handleAdd = async (url: string, label: string, iconUrl: string) => {
    const maxPos = shortcuts.reduce((m, sc) => Math.max(m, sc.position), -1)
    const sc: Shortcut = {
      id: crypto.randomUUID(),
      url,
      label,
      iconUrl,
      position: maxPos + 1,
      size: shortcutSize,
    }
    const next = [...shortcuts, sc]
    setShortcuts(next)
    await storage.local.set("shortcuts", next)
    setShowAddForm(false)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (!loaded) return null

  if (shortcuts.length === 0 && !adminMode) {
    return (
      <p
        style={{
          color: "var(--color-text-muted)",
          fontSize: "1rem",
          margin: 0,
        }}
      >
        Ask your caregiver to add your <Mark>favourite websites</Mark> here.
      </p>
    )
  }

  // Hostnames already in the grid — passed to AddShortcutForm to grey out duplicates
  const existingHostnames = shortcuts.map((sc) => {
    try {
      return new URL(sc.url).hostname
    } catch {
      return sc.url
    }
  })

  return (
    <>
      {/* Outer wrapper carries the tour target; inner gridRef div is the SortableJS container. */}
      <div
        data-tour="shortcuts"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.35s ease",
        }}
      >
        {/* Global size control — admin mode only */}
        {adminMode && (
          <div data-tour="size-control">
            <SizeControl size={shortcutSize} onChange={handleSizeChange} />
          </div>
        )}

        {/*
          gridRef is both the SortableJS container AND the CSS grid.
          SortableJS needs a real bounding box — display:contents broke it.
          The Add button lives inside the grid but is excluded from sorting
          via draggable:'[data-id]' (it has no data-id) and onMove guard.
        */}
        <div
          ref={gridRef}
          aria-label="Shortcuts"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: "1rem",
          }}
        >
          {shortcuts.map((sc) =>
            adminMode ? (
              <AdminTile
                key={sc.id}
                shortcut={sc}
                size={shortcutSize}
                onRequestDelete={setPendingDelete}
                onRename={handleRename}
              />
            ) : (
              <ViewTile key={sc.id} shortcut={sc} size={shortcutSize} />
            ),
          )}

          {/* Add tile — has no data-id so SortableJS ignores it entirely.
              onMove prevents other tiles from being dragged past it. */}
          {adminMode && (
            <button
              type="button"
              data-tour="add-shortcut"
              onClick={() => setShowAddForm(true)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                padding: "1rem",
                minHeight: 80,
                background: "transparent",
                border: "2px dashed var(--color-surface-edge)",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                color: "var(--color-text-muted)",
                fontSize: "0.875rem",
                fontWeight: 600,
                fontFamily: "inherit",
                transition: "background 0.15s, border-color 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--color-surface)"
                e.currentTarget.style.borderColor = "var(--color-accent-light)"
                e.currentTarget.style.color = "var(--color-accent)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent"
                e.currentTarget.style.borderColor = "var(--color-surface-edge)"
                e.currentTarget.style.color = "var(--color-text-muted)"
              }}
            >
              <PlusIcon size={22} weight="bold" />
              Add shortcut
            </button>
          )}
        </div>
      </div>

      {/* Centred delete confirmation modal (A-06) */}
      {pendingDelete && (
        <DeleteConfirmModal
          shortcut={pendingDelete}
          onConfirm={() => handleDelete(pendingDelete.id)}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {/* Add shortcut form with popular + visited chips (A-05) */}
      {showAddForm && (
        <AddShortcutForm
          existingUrls={existingHostnames}
          onAdd={handleAdd}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Undo toast (A-06) */}
      {undoSnap && (
        <UndoToast label={undoSnap.deletedLabel} onUndo={handleUndo} />
      )}
    </>
  )
}
