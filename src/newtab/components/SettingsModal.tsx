// SettingsModal shell + tabs: Profile, Security, Saved Links, Activity Log

import { useCallback, useEffect, useRef, useState } from "react"
import { useFocusTrap } from "@shared/useFocusTrap"
import {
  BookmarkSimpleIcon,
  ClipboardTextIcon,
  ShieldCheckIcon,
  UserIcon,
} from "@phosphor-icons/react"
import { storage } from "@shared/storage"
import { FloatingToast, useToast } from "@shared/toast"
import { ProfileTab } from "./settings/ProfileTab"
import { SecurityTab } from "./settings/SecurityTab"
import { SavedLinksTab } from "./settings/SavedLinksTab"
import { ActivityLogTab } from "./settings/ActivityLogTab"

// ── Modal shell ───────────────────────────────────────────────────────────────

type Tab = "profile" | "security" | "savedLinks" | "activityLog"

interface TabMeta {
  id: Tab
  /** Sidebar nav label — short, scannable. */
  label: string
  /** Content-area heading — usually matches the label. */
  title: string
  /** One-line instructional subtitle under the heading. Direct voice. */
  subtitle: string
  icon: React.ReactNode
}

const TABS: TabMeta[] = [
  {
    id: "profile",
    label: "General",
    title: "General",
    subtitle: "Names, theme, and the senior walkthrough.",
    icon: <UserIcon size={14} />,
  },
  {
    id: "security",
    label: "Safety",
    title: "Safety",
    subtitle: "All on by default. Tweak only if needed.",
    icon: <ShieldCheckIcon size={14} />,
  },
  {
    id: "savedLinks",
    label: "Saved pages",
    title: "Saved pages",
    subtitle: "Pages the senior chose to keep.",
    icon: <BookmarkSimpleIcon size={14} />,
  },
  {
    id: "activityLog",
    label: "Activity log",
    title: "Activity log",
    subtitle: "Every website visited, with timestamps.",
    icon: <ClipboardTextIcon size={14} />,
  },
]

interface ModalProps {
  onClose: () => void
  onStartSeniorTour: () => void
}

export function SettingsModal({ onClose, onStartSeniorTour }: ModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("profile")
  const [seniorName, setSeniorName] = useState("")
  const dialogRef = useRef<HTMLDivElement>(null)
  const { toast, showToast, closeToast } = useToast()

  // Eyebrow uses the senior's name — "Maria's setup" — so the caregiver
  // sees who they're configuring. Falls back gracefully when blank.
  useEffect(() => {
    storage.local
      .get("config")
      .then((c) => setSeniorName(c.seniorName?.trim() ?? ""))
      .catch(() => {})
  }, [])

  // A2: trap focus inside the dialog while open.
  useFocusTrap(dialogRef)

  // Lock body scroll while open.
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  // Reset the senior's TEXT SIZE zoom while the modal is open.
  // The senior-facing zoom (applied to <html>) scales every pixel and rem
  // value on this page — including this modal — so at 1.5× the modal
  // overflows the viewport and content gets clipped at the edges. The
  // caregiver doesn't need senior-sized text; we render the modal at 1×
  // for the duration it's open, then restore the senior's choice on close.
  useEffect(() => {
    const html = document.documentElement
    const previousZoom = html.style.zoom
    html.style.zoom = ""
    return () => {
      html.style.zoom = previousZoom
    }
  }, [])

  // Close on Escape.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  // Currently-active tab's metadata — used by the content-area header.
  const currentTab = TABS.find((t) => t.id === activeTab) ?? TABS[0]!

  // A4: keyboard arrow navigation between tabs (ARIA tablist pattern,
  // vertical orientation — Up/Down because the nav is now a sidebar).
  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return
      e.preventDefault()
      const ids = TABS.map((t) => t.id)
      const currentIndex = ids.indexOf(activeTab)
      const next =
        e.key === "ArrowDown"
          ? (currentIndex + 1) % ids.length
          : (currentIndex - 1 + ids.length) % ids.length
      setActiveTab(ids[next]!)
      // Move DOM focus to the newly selected tab button.
      const tabEl = document.getElementById(`settings-tab-${ids[next]}`)
      tabEl?.focus()
    },
    [activeTab],
  )

  return (
    /* Backdrop — solid overlay, no blur (P2: blur is expensive on low-end GPUs) */
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(28, 24, 20, 0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.25rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <FloatingToast toast={toast} onClose={closeToast} />
      {/* Modal card — two-column shell: 220px sidebar + content.
          Fixed pixel dimensions (not vh) so the layout is stable even
          if the viewport, font, or text size changes underneath. Tab
          content scrolls inside the right column when it overflows. */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        className="sw-modal-in"
        style={{
          background: "var(--color-bg)",
          borderRadius: "var(--radius-xl)",
          width: "min(880px, calc(100vw - 2.5rem))",
          height: "min(640px, calc(100vh - 2.5rem))",
          display: "grid",
          gridTemplateColumns: "220px 1fr",
          boxShadow: "var(--shadow-xl)",
          border: "1.5px solid var(--color-surface-edge)",
          overflow: "hidden",
        }}
      >
        {/* ── Left sidebar ─────────────────────────────────────────── */}
        <nav
          aria-label="Settings sections"
          style={{
            background: "var(--color-surface)",
            borderRight: "1.5px solid var(--color-surface-edge)",
            padding: "1.25rem 0.75rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.2rem",
            minHeight: 0,
            overflowY: "auto",
          }}
        >
          {/* Small wordmark anchors the modal — caregiver brand reassurance */}
          <img
            src="/brand/logo.svg"
            alt="SeniorBrowse"
            aria-hidden="true"
            style={{
              height: 22,
              width: "auto",
              margin: "0 0.5rem 1rem",
            }}
          />

          {/* Eyebrow: who this configuration is for */}
          <p
            id="settings-modal-title"
            style={{
              margin: "0 0 0.35rem",
              padding: "0 0.65rem",
              fontSize: "0.7rem",
              fontWeight: 700,
              color: "var(--color-text-subtle)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            {seniorName ? `${seniorName}'s setup` : "Caregiver setup"}
          </p>

          {/* Vertical tablist */}
          <div
            role="tablist"
            aria-orientation="vertical"
            onKeyDown={handleTabKeyDown}
            style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}
          >
            {TABS.map(({ id, label, icon }) => {
              const active = activeTab === id
              return (
                <button
                  key={id}
                  id={`settings-tab-${id}`}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls={`settings-panel-${id}`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => setActiveTab(id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    padding: "0.55rem 0.7rem",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    background: active
                      ? "var(--color-accent-light)"
                      : "transparent",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    fontWeight: active ? 700 : 600,
                    fontFamily: "inherit",
                    color: active
                      ? "var(--color-accent)"
                      : "var(--color-text-muted)",
                    textAlign: "left" as const,
                    whiteSpace: "nowrap" as const,
                    transition: "background 0.15s, color 0.15s",
                    minHeight: 36,
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = "var(--color-bg)"
                      e.currentTarget.style.color = "var(--color-text)"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = "transparent"
                      e.currentTarget.style.color = "var(--color-text-muted)"
                    }
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    {icon}
                  </span>
                  {label}
                </button>
              )
            })}
          </div>
        </nav>

        {/* ── Right content area ───────────────────────────────────── */}
        <section
          style={{
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {/* Content header: section title + subtitle + close button */}
          <header
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "1rem",
              padding: "1.4rem 1.5rem 1rem",
              flexShrink: 0,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.3rem",
                  fontWeight: 700,
                  color: "var(--color-text)",
                  letterSpacing: "-0.01em",
                }}
              >
                {currentTab.title}
              </h2>
              <p
                style={{
                  margin: "0.15rem 0 0",
                  fontSize: "0.85rem",
                  color: "var(--color-text-muted)",
                  fontWeight: 500,
                  lineHeight: 1.4,
                }}
              >
                {currentTab.subtitle}
              </p>
            </div>

            {/* Close button — 44×44 tap target, lives inside the content area */}
            <button
              onClick={onClose}
              aria-label="Close settings"
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: "1.5px solid var(--color-surface-edge)",
                background: "var(--color-bg)",
                cursor: "pointer",
                fontSize: "1.2rem",
                fontWeight: 700,
                color: "var(--color-text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.2s, color 0.2s, border-color 0.2s",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--color-surface-edge)"
                e.currentTarget.style.color = "var(--color-text)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--color-bg)"
                e.currentTarget.style.color = "var(--color-text-muted)"
              }}
            >
              ×
            </button>
          </header>

          {/* Tab panel — scrolls when its content exceeds available height */}
          <div
            id={`settings-panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`settings-tab-${activeTab}`}
            tabIndex={0}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "0 1.5rem 1.5rem",
            }}
          >
            {activeTab === "profile" && (
              <ProfileTab
                onStartSeniorTour={onStartSeniorTour}
                showToast={showToast}
              />
            )}
            {activeTab === "security" && <SecurityTab showToast={showToast} />}
            {activeTab === "savedLinks" && <SavedLinksTab />}
            {activeTab === "activityLog" && (
              <ActivityLogTab showToast={showToast} />
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
