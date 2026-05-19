import { useEffect, useState } from "react"
import { storage } from "@shared/storage"
import type { ActivityLogEntry } from "@shared/types"

interface RecentSite {
  url: string
  title: string
  hostname: string
  iconUrl: string
}

function buildRecentSites(log: ActivityLogEntry[]): RecentSite[] {
  const seen = new Set<string>()
  const sites: RecentSite[] = []

  const sorted = [...log]
    .filter((e) => e.type === "visit")
    .sort((a, b) => b.visitedAt.localeCompare(a.visitedAt))

  for (const entry of sorted) {
    try {
      const { hostname } = new URL(entry.url)
      if (seen.has(hostname)) continue
      seen.add(hostname)
      const display = hostname.replace(/^www\./, "")
      sites.push({
        url: entry.url,
        title: entry.title || display,
        hostname,
        iconUrl: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`,
      })
      if (sites.length === 3) break
    } catch {
      /* invalid URL */
    }
  }

  return sites
}

const STAGGER = ["sw-stagger-1", "sw-stagger-2", "sw-stagger-3"] as const

function SiteCard({ site, index }: { site: RecentSite; index: number }) {
  const [hovered, setHovered] = useState(false)
  const stagger = STAGGER[index] ?? "sw-stagger-1"

  return (
    <a
      href={site.url}
      title={site.title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`sw-fade-up ${stagger}`}
      style={{
        flex: "1 1 0",
        minWidth: 0,
        display: "flex",
        alignItems: "center",
        gap: "0.9rem",
        padding: "0.65rem 1rem",
        borderRadius: "var(--radius-md)",
        background: hovered
          ? "var(--color-surface-raised)"
          : "var(--color-surface)",
        border: `1.5px solid ${hovered ? "var(--color-surface-edge-mid)" : "var(--color-surface-edge)"}`,
        boxShadow: hovered ? "var(--shadow-md)" : "var(--shadow-xs)",
        textDecoration: "none",
        color: "var(--color-text)",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        transition:
          "background 0.18s, border-color 0.18s, box-shadow 0.18s, transform 0.18s cubic-bezier(.22,.68,0,1.4)",
        overflow: "hidden",
      }}
    >
      {/* Favicon in a rounded container */}
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: "var(--radius-sm)",
          background: "var(--color-accent-xlight)",
          border: "1px solid var(--color-accent-light)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        <img
          src={site.iconUrl}
          alt=""
          width={24}
          height={24}
          style={{ objectFit: "contain", display: "block" }}
          onError={(e) => {
            ;(e.currentTarget as HTMLImageElement).style.display = "none"
          }}
        />
      </div>

      {/* Text */}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: "0.975rem",
            fontWeight: 600,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            lineHeight: 1.3,
            color: "var(--color-text)",
          }}
        >
          {site.title.length > 28 ? site.title.slice(0, 28) + "…" : site.title}
        </div>
        <div
          style={{
            marginTop: "0.18rem",
            fontSize: "0.78rem",
            fontWeight: 500,
            color: "var(--color-text-muted)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            lineHeight: 1.3,
          }}
        >
          {site.hostname.replace(/^www\./, "")}
        </div>
      </div>

      {/* Arrow hint on hover */}
      <div
        style={{
          marginLeft: "auto",
          flexShrink: 0,
          color: "var(--color-text-subtle)",
          fontSize: "1.5rem",
          opacity: hovered ? 1 : 0,
          transform: hovered ? "translateX(0)" : "translateX(-4px)",
          transition: "opacity 0.18s, transform 0.18s",
        }}
        aria-hidden="true"
      >
        →
      </div>
    </a>
  )
}

export function RecentSites() {
  const [sites, setSites] = useState<RecentSite[]>([])

  useEffect(() => {
    storage.local
      .get("activityLog")
      .then((log) => setSites(buildRecentSites(log)))
      .catch(() => {})

    const onChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area !== "local" || !("activityLog" in changes)) return
      const log = (changes["activityLog"]?.newValue as ActivityLogEntry[]) ?? []
      setSites(buildRecentSites(log))
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  if (sites.length === 0) return null

  return (
    <section aria-label="Recently visited sites" data-tour="recent">
      <p
        style={{
          margin: "0 0 0.5rem 0",
          fontSize: "0.8rem",
          fontWeight: 700,
          color: "var(--color-text-subtle)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        Pick up where you left off
      </p>

      <div style={{ display: "flex", gap: "0.65rem" }}>
        {sites.map((site, i) => (
          <SiteCard key={site.hostname} site={site} index={i} />
        ))}
      </div>
    </section>
  )
}
