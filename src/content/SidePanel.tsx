/** @jsxImportSource preact */
// Features: button set, zoom, save link, admin banner, drag reorder,
// label edit + visibility toggle

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
import { HomeIcon, ExitIcon, ICONS } from "./components/icons"
import { PanelButton } from "./components/PanelButton"
import { AdminRow } from "./components/AdminRow"
import { SaveToast } from "./components/SaveToast"

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

  // ── SortableJS button reorder ──────────────────────────────────────────────
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

  // ── Zoom ───────────────────────────────────────────────────────────────────
  const handleZoom = useCallback(async () => {
    const nextIdx = (fontIdx + 1) % FONT_SIZES.length
    const next: FontSize = FONT_SIZES[nextIdx] ?? "normal"
    setFontIdx(nextIdx)
    applyFontToPage(next)
    await storage.session.set("currentFontSize", next)
  }, [fontIdx])

  // ── Save ───────────────────────────────────────────────────────────────────
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

  // ── Label change ───────────────────────────────────────────────────────────
  const handleLabelChange = useCallback((id: string, label: string) => {
    setBtnCfgs((prev) => {
      const base = prev[id] ??
        DEFAULT_PANEL_BUTTONS[id] ?? { label, visible: true }
      const next = { ...prev, [id]: { ...base, label } }
      void storage.local.update("config", { panelButtons: next })
      return next
    })
  }, [])

  // ── Visibility toggle ───────────────────────────────────────────────────────
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
      {/* Edit mode indicator */}
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

      {/* Admin drag list */}
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
