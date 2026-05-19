/** @jsxImportSource preact */
// P-03: Button set  P-04: Zoom  P-05: Save link
// A-02: Admin banner  A-07: Drag reorder  A-08: Label edit + visibility toggle

import { useState, useEffect, useCallback, useRef } from "preact/hooks"
import Sortable from "sortablejs"
import { storage } from "@shared/storage"
import {
  FONT_SIZES,
  FONT_SIZE_LABELS,
  DEFAULT_PANEL_BUTTON_ORDER,
  DEFAULT_PANEL_BUTTONS,
} from "@shared/constants"
import type { FontSize, PanelPosition, PanelButtonConfig } from "@shared/types"

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  position: PanelPosition
  layoutMode: "column" | "floating"
}

// ── Font helpers ──────────────────────────────────────────────────────────────

const FONT_CLASS: Record<FontSize, string> = {
  normal: "sw-font-normal",
  large: "sw-font-large",
  xlarge: "sw-font-xlarge",
}

function applyFontToPage(size: FontSize) {
  const html = document.documentElement
  Object.values(FONT_CLASS).forEach((c) => html.classList.remove(c))
  html.classList.add(FONT_CLASS[size])
}

// ── SVG icons ─────────────────────────────────────────────────────────────────

const SZ = 22

const Ico = ({ children }: { children: preact.ComponentChildren }) => (
  <svg
    width={SZ}
    height={SZ}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    style={{ flexShrink: 0 }}
  >
    {children}
  </svg>
)

const HomeIcon = () => (
  <Ico>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </Ico>
)
const BackIcon = () => (
  <Ico>
    <polyline points="15 18 9 12 15 6" />
  </Ico>
)
const FwdIcon = () => (
  <Ico>
    <polyline points="9 18 15 12 9 6" />
  </Ico>
)
const TopIcon = () => (
  <Ico>
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </Ico>
)
const SaveIcon = () => (
  <Ico>
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </Ico>
)
const ExitIcon = () => (
  <Ico>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </Ico>
)
const ZoomIcon = () => (
  <svg
    width={SZ}
    height={SZ}
    viewBox="0 0 24 24"
    aria-hidden="true"
    style={{ flexShrink: 0 }}
  >
    <text
      x="1"
      y="16"
      font-size="9"
      font-family="system-ui,sans-serif"
      font-weight="bold"
      fill="currentColor"
    >
      A
    </text>
    <text
      x="11"
      y="20"
      font-size="14"
      font-family="system-ui,sans-serif"
      font-weight="bold"
      fill="currentColor"
    >
      A
    </text>
  </svg>
)
const EditIcon = () => (
  <Ico>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </Ico>
)

const EyeIcon = () => (
  <Ico>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </Ico>
)

const EyeSlashIcon = () => (
  <Ico>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </Ico>
)

const ICONS: Record<string, () => preact.JSX.Element> = {
  home: HomeIcon,
  back: BackIcon,
  forward: FwdIcon,
  scrollTop: TopIcon,
  zoom: ZoomIcon,
  save: SaveIcon,
  exit: ExitIcon,
}

// ── Panel button (view mode) ──────────────────────────────────────────────────

interface BtnProps {
  icon: () => preact.JSX.Element
  label: string
  onClick: () => void
  isPrimary?: boolean
  disabled?: boolean
}

function PanelButton({
  icon: Icon,
  label,
  onClick,
  isPrimary = false,
  disabled = false,
}: BtnProps) {
  const [hovered, setHovered] = useState(false)

  const base: preact.JSX.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    width: "100%",
    padding: isPrimary ? "16px 14px" : "13px 14px",
    fontSize: isPrimary ? "17px" : "16px",
    fontWeight: 600,
    textAlign: "left" as const,
    color: isPrimary
      ? "var(--sw-accent-fg)"
      : hovered
        ? "var(--sw-accent)"
        : "var(--sw-text)",
    background: isPrimary
      ? hovered
        ? "var(--sw-accent-strong)"
        : "var(--sw-accent)"
      : hovered
        ? "var(--sw-surface)"
        : "transparent",
    borderRadius: "var(--sw-radius)",
    transition: "background 0.12s, color 0.12s",
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.45 : 1,
    border: "none",
    outline: "none",
  }

  return (
    <button
      style={base}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={label}
    >
      <Icon />
      <span style={{ lineHeight: 1.2 }}>{label}</span>
    </button>
  )
}

// ── Admin row (A-07 drag, A-08 edit) ─────────────────────────────────────────

interface AdminRowProps {
  id: string
  icon: () => preact.JSX.Element
  cfg: PanelButtonConfig
  isPrimary: boolean
  onLabelChange: (id: string, label: string) => void
  onVisibilityToggle: (id: string) => void
}

function AdminRow({
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

// ── Save toast ────────────────────────────────────────────────────────────────

function SaveToast({ message }: { message: string }) {
  return (
    <div
      style={{
        margin: "0 8px 4px",
        padding: "10px 12px",
        background: "var(--sw-surface)",
        border: "1.5px solid var(--sw-surface-edge)",
        borderRadius: "var(--sw-radius)",
        fontSize: "16px",
        lineHeight: 1.4,
        color: "var(--sw-text)",
      }}
    >
      {message}
    </div>
  )
}

// ── Side panel ────────────────────────────────────────────────────────────────

export function SidePanel({ position, layoutMode }: Props) {
  const [fontIdx, setFontIdx] = useState(0)
  const [saveMsg, setSaveMsg] = useState("")
  const [caregiverName, setCaregiverName] = useState("")
  const [adminMode, setAdminMode] = useState(false)
  const [btnOrder, setBtnOrder] = useState<string[]>([
    ...DEFAULT_PANEL_BUTTON_ORDER,
  ])
  const [btnCfgs, setBtnCfgs] = useState<Record<string, PanelButtonConfig>>({
    ...DEFAULT_PANEL_BUTTONS,
  })

  const listRef = useRef<HTMLDivElement>(null)
  const sortableRef = useRef<Sortable | null>(null)

  // ── Load initial state ────────────────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      try {
        const [session, config, isAdmin] = await Promise.all([
          storage.session.get("currentFontSize"),
          storage.local.get("config"),
          storage.session.get("adminModeActive"),
        ])
        setCaregiverName(config.caregiverName.trim())
        setAdminMode(isAdmin)

        const order = config.panelButtonOrder.length
          ? config.panelButtonOrder
          : [...DEFAULT_PANEL_BUTTON_ORDER]
        setBtnOrder(order)
        setBtnCfgs({ ...DEFAULT_PANEL_BUTTONS, ...config.panelButtons })

        const active: FontSize = session ?? config.defaultFontSize
        const idx = FONT_SIZES.indexOf(active)
        setFontIdx(idx >= 0 ? idx : 0)
        applyFontToPage(active)
      } catch {
        /* use defaults */
      }
    })()
  }, [])

  // ── Admin mode message listener ───────────────────────────────────────────
  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.runtime?.onMessage) return
    const handler = (msg: unknown) => {
      if (typeof msg !== "object" || msg === null || !("type" in msg)) return
      const m = msg as { type: string; payload?: { active: boolean } }
      if (m.type === "ADMIN_MODE_CHANGED" && m.payload !== undefined) {
        setAdminMode(m.payload.active)
      }
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [])

  // ── SortableJS button reorder (A-07) ──────────────────────────────────────
  useEffect(() => {
    if (!adminMode || !listRef.current) {
      sortableRef.current?.destroy()
      sortableRef.current = null
      return
    }

    sortableRef.current = Sortable.create(listRef.current, {
      animation: 120,
      dataIdAttr: "data-id",
      onEnd: () => {
        const order = sortableRef.current!.toArray()
        setBtnOrder(order)
        void storage.local.update("config", { panelButtonOrder: order })
      },
    })

    return () => {
      sortableRef.current?.destroy()
      sortableRef.current = null
    }
  }, [adminMode])

  // ── Zoom (P-04) ───────────────────────────────────────────────────────────
  const handleZoom = useCallback(async () => {
    const nextIdx = (fontIdx + 1) % FONT_SIZES.length
    const next: FontSize = FONT_SIZES[nextIdx] ?? "normal"
    setFontIdx(nextIdx)
    applyFontToPage(next)
    await storage.session.set("currentFontSize", next)
  }, [fontIdx])

  // ── Save (P-05) ───────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    try {
      const url = window.location.href
      const title = document.title || url
      const links = await storage.local.get("savedLinks")
      const existIdx = links.findIndex((l) => l.url === url)
      const entry = {
        id:
          existIdx >= 0
            ? (links[existIdx]?.id ?? crypto.randomUUID())
            : crypto.randomUUID(),
        url,
        title,
        savedAt: new Date().toISOString(),
      }
      const next =
        existIdx >= 0
          ? links.map((l, i) => (i === existIdx ? entry : l))
          : [...links, entry]
      await storage.local.set("savedLinks", next)
      const who = caregiverName || "your caregiver"
      setSaveMsg(`Saved! ${who} will see this in their panel.`)
      setTimeout(() => setSaveMsg(""), 3_500)
    } catch {
      setSaveMsg("Could not save. Please try again.")
      setTimeout(() => setSaveMsg(""), 3_500)
    }
  }, [caregiverName])

  // ── A-08 label change ────────────────────────────────────────────────────
  const handleLabelChange = useCallback((id: string, label: string) => {
    setBtnCfgs((prev) => {
      const base = prev[id] ??
        DEFAULT_PANEL_BUTTONS[id] ?? { label, visible: true }
      const next = { ...prev, [id]: { ...base, label } }
      void storage.local.update("config", { panelButtons: next })
      return next
    })
  }, [])

  // ── A-08 visibility toggle ────────────────────────────────────────────────
  const handleVisibility = useCallback((id: string) => {
    setBtnCfgs((prev) => {
      const cur = prev[id] ??
        DEFAULT_PANEL_BUTTONS[id] ?? { label: id, visible: true }
      const visCount = Object.values(prev).filter((c) => c.visible).length
      if (cur.visible && visCount <= 1) return prev // guard: always keep one visible
      const next = { ...prev, [id]: { ...cur, visible: !cur.visible } }
      void storage.local.update("config", { panelButtons: next })
      return next
    })
  }, [])

  // ── Handlers ─────────────────────────────────────────────────────────────
  const currentSize: FontSize = FONT_SIZES[fontIdx] ?? "normal"
  const zoomBaseLabel = btnCfgs["zoom"]?.label ?? "TEXT SIZE"
  const zoomLabel = `${zoomBaseLabel}: ${FONT_SIZE_LABELS[currentSize]}`

  const handlers: Record<string, () => void> = {
    home: () => {
      window.location.href = chrome.runtime.getURL("newtab/index.html")
    },
    back: () => window.history.back(),
    forward: () => window.history.forward(),
    scrollTop: () => window.scrollTo({ top: 0, behavior: "smooth" }),
    zoom: handleZoom,
    save: handleSave,
    exit: () => window.close(),
  }

  const innerBorder = position === "left" ? "borderRight" : "borderLeft"

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--sw-bg)",
        [innerBorder]: "1.5px solid var(--sw-surface-edge)",
        boxShadow: layoutMode === "floating" ? "var(--sw-shadow)" : "none",
        padding: "10px 8px",
        gap: "2px",
        overflowY: "auto",
      }}
    >
      {/* A-02: Edit mode indicator */}
      {adminMode && (
        <div
          style={{
            margin: "0 0 6px",
            padding: "7px 10px",
            background: "var(--sw-accent)",
            color: "var(--sw-accent-fg)",
            borderRadius: "var(--sw-radius)",
            fontSize: "12px",
            fontWeight: 700,
            textAlign: "center" as const,
            letterSpacing: "0.02em",
          }}
        >
          ✏️ Edit mode
        </div>
      )}

      {/* A-07 + A-08: admin drag list */}
      {adminMode ? (
        <div
          ref={listRef}
          style={{ display: "flex", flexDirection: "column", gap: "4px" }}
        >
          {btnOrder.map((id) => {
            const icon = ICONS[id] ?? HomeIcon
            const cfg = btnCfgs[id] ??
              DEFAULT_PANEL_BUTTONS[id] ?? { label: id, visible: true }
            return (
              <AdminRow
                key={id}
                id={id}
                icon={icon}
                cfg={cfg}
                isPrimary={id === "home"}
                onLabelChange={handleLabelChange}
                onVisibilityToggle={handleVisibility}
              />
            )
          })}
        </div>
      ) : (
        <>
          {/* Home button (primary, always at top) */}
          {(btnCfgs["home"]?.visible ?? true) && (
            <PanelButton
              icon={HomeIcon}
              label={btnCfgs["home"]?.label ?? "HOME"}
              isPrimary
              onClick={handlers["home"]!}
            />
          )}

          <div style={{ height: 6 }} />

          {/* Mid buttons in stored order */}
          {btnOrder
            .filter((id) => id !== "home" && id !== "exit")
            .filter((id) => btnCfgs[id]?.visible ?? true)
            .map((id) => {
              const icon = ICONS[id] ?? HomeIcon
              const cfg = btnCfgs[id] ?? DEFAULT_PANEL_BUTTONS[id]
              const label = id === "zoom" ? zoomLabel : (cfg?.label ?? id)
              return (
                <PanelButton
                  key={id}
                  icon={icon}
                  label={label}
                  onClick={handlers[id] ?? (() => {})}
                  disabled={id === "save" && !!saveMsg}
                />
              )
            })}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {saveMsg && <SaveToast message={saveMsg} />}

          {/* Exit */}
          {(btnCfgs["exit"]?.visible ?? true) && (
            <PanelButton
              icon={ExitIcon}
              label={btnCfgs["exit"]?.label ?? "CLOSE PAGE"}
              onClick={handlers["exit"]!}
            />
          )}
        </>
      )}
    </div>
  )
}
