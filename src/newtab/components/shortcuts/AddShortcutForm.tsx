import { useEffect, useRef, useState } from "react"
import { useFocusTrap } from "@shared/useFocusTrap"
import { storage } from "@shared/storage"
import {
  BookIcon,
  ChatCircleIcon,
  CheckIcon,
  EnvelopeIcon,
  FilmStripIcon,
  GlobeIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  NewspaperIcon,
  PlayIcon,
  ShoppingCartIcon,
  UsersIcon,
} from "@phosphor-icons/react"
import type { ActivityLogEntry } from "@shared/types"

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

// ── Add shortcut form ──────────────────────────────────────────────────────

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

export function AddShortcutForm({ existingUrls, onAdd, onCancel }: AddFormProps) {
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

  // Trap Tab/Shift+Tab inside the form; keep the URL input's own auto-focus
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
          width: "100%",
          maxWidth: 520,
          maxHeight: "88vh",
          boxShadow: "0 8px 40px rgba(42,38,32,0.22)",
          // Clip here so the scrollbar (on the inner div below) never cuts
          // into the rounded corners.
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
      <div
        style={{
          overflowY: "auto",
          padding: "1.75rem",
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
    </div>
  )
}
