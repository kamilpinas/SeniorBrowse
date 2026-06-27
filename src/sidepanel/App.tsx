// Side panel UI — senior-optimised two-column tile layout with Phosphor icons.

import { useCallback, useEffect, useRef, useState } from "react"
import Sortable from "sortablejs"
import {
  ArrowCounterClockwiseIcon,
  ArrowLeftIcon,
  ArrowLineUpIcon,
  ArrowRightIcon,
  ArrowsClockwiseIcon,
  ArrowsInIcon,
  ArrowsOutIcon,
  BookmarkSimpleIcon,
  HouseIcon,
  TextAaIcon,
  XCircleIcon,
} from "@phosphor-icons/react"
import { storage } from "@shared/storage"
import { FloatingToast, useToast } from "@shared/toast"
import {
  FONT_SIZES,
  DEFAULT_PANEL_BUTTON_ORDER,
  DEFAULT_PANEL_BUTTONS,
} from "@shared/constants"
import type { FontSize, PanelButtonConfig } from "@shared/types"
import { Tile } from "./components/Tile"
import { ZoomTile } from "./components/ZoomTile"
import { VolumeControlTile } from "./components/VolumeControlTile"
import { ScrollControlTile } from "./components/ScrollControlTile"
import { AdminRow } from "./components/AdminRow"
import { CloseBrowserConfirm } from "./components/CloseBrowserConfirm"
import { PanelWizard } from "./components/PanelWizard"

// ── Icon map (Phosphor, weight="bold") ────────────────────────────────────────

const PHOSPHOR: Record<string, React.ReactNode> = {
  home: <HouseIcon size={36} weight="bold" />,
  back: <ArrowLeftIcon size={36} weight="bold" />,
  forward: <ArrowRightIcon size={36} weight="bold" />,
  scrollTop: <ArrowLineUpIcon size={36} weight="bold" />,
  zoom: <TextAaIcon size={36} weight="bold" />,
  save: <BookmarkSimpleIcon size={36} weight="bold" />,
  fullscreen: <ArrowsOutIcon size={36} weight="bold" />,
  refresh: <ArrowsClockwiseIcon size={36} weight="bold" />,
  exit: <XCircleIcon size={36} weight="bold" />,
}

// ── App ───────────────────────────────────────────────────────────────────────

export function App() {
  const [fontIdx, setFontIdx] = useState(0)
  const [volume, setVolume] = useState(1.0)
  const [scrollPct, setScrollPct] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLastTab, setIsLastTab] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const { toast, showToast, closeToast } = useToast()
  const [adminMode, setAdminMode] = useState(false)
  const [showPanelWizard, setShowPanelWizard] = useState(false)
  const [btnOrder, setBtnOrder] = useState([...DEFAULT_PANEL_BUTTON_ORDER])
  const [btnCfgs, setBtnCfgs] = useState<Record<string, PanelButtonConfig>>({
    ...DEFAULT_PANEL_BUTTONS,
  })

  const caregiverName = useRef("")
  const listRef = useRef<HTMLDivElement>(null)
  const sortableRef = useRef<Sortable | null>(null)
  // Once the panel wizard is dismissed (skip or complete) we never show it
  // again in this session — even if a concurrent config write fires onChanged
  // before panelWizardDone:true has landed in storage.
  const panelWizardDismissed = useRef(false)

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      try {
        const [session, config, isAdmin] = await Promise.all([
          storage.session.get("currentFontSize"),
          storage.local.get("config"),
          storage.session.get("adminModeActive"),
        ])
        caregiverName.current = config.caregiverName?.trim() ?? ""
        setAdminMode(!!isAdmin)
        // Only show panel wizard AFTER the newtab onboarding is done.
        // panelWizardDone guards against showing it a second time.
        if (
          config.onboardingDone &&
          !config.panelWizardDone &&
          !panelWizardDismissed.current
        )
          setShowPanelWizard(true)
        const savedOrder = config.panelButtonOrder?.length
          ? config.panelButtonOrder
          : [...DEFAULT_PANEL_BUTTON_ORDER]
        // Append any newly-added default buttons missing from the stored order
        const savedSet = new Set(savedOrder)
        const newIds = DEFAULT_PANEL_BUTTON_ORDER.filter(
          (id) => !savedSet.has(id),
        )
        setBtnOrder(newIds.length ? [...savedOrder, ...newIds] : savedOrder)
        setBtnCfgs({ ...DEFAULT_PANEL_BUTTONS, ...config.panelButtons })
        const active: FontSize = (session ?? config.defaultFontSize) as FontSize
        const idx = FONT_SIZES.indexOf(active)
        setFontIdx(idx >= 0 ? idx : 0)
      } catch {
        /* use defaults */
      }
    })()
  }, [])

  // ── Sync fullscreen state with the real window state ─────────────────────
  // Reads chrome.windows so the button icon stays accurate even when the user
  // presses F11 or Escape directly (without using the panel button).
  useEffect(() => {
    const sync = () => {
      chrome.windows.getCurrent((win) => {
        setIsFullscreen(win.state === "fullscreen")
      })
    }
    sync() // initialise on mount
    chrome.tabs.onActivated.addListener(sync)
    return () => chrome.tabs.onActivated.removeListener(sync)
  }, [])

  // ── Track whether this is the only tab left in the window ────────────────
  // Two-step: (1) get the active tab via lastFocusedWindow to extract its
  // windowId without relying on any "current window" context, then (2) count
  // all tabs with that exact windowId. This avoids every sidepanel ambiguity.
  useEffect(() => {
    const update = () => {
      chrome.tabs.query(
        { active: true, lastFocusedWindow: true },
        ([activeTab]) => {
          if (chrome.runtime.lastError || !activeTab?.windowId) {
            setIsLastTab(false)
            return
          }
          chrome.tabs.query({ windowId: activeTab.windowId }, (tabs) => {
            if (chrome.runtime.lastError) return
            setIsLastTab(tabs.length <= 1)
          })
        },
      )
    }
    update()
    chrome.tabs.onCreated.addListener(update)
    chrome.tabs.onRemoved.addListener(update)
    chrome.tabs.onActivated.addListener(update)
    return () => {
      chrome.tabs.onCreated.removeListener(update)
      chrome.tabs.onRemoved.removeListener(update)
      chrome.tabs.onActivated.removeListener(update)
    }
  }, [])

  // ── Admin mode broadcast + close requests ─────────────────────────────────
  useEffect(() => {
    const handler = (msg: unknown) => {
      if (!msg || typeof msg !== "object" || !("type" in msg)) return
      const m = msg as { type: string; payload?: { active: boolean } }
      if (m.type === "ADMIN_MODE_CHANGED" && m.payload != null) {
        setAdminMode(m.payload.active)
      }
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [])

  // ── Watch for newtab onboarding completing while panel is already open ────
  // Needed because the panel may be open before the user finishes the wizard.
  useEffect(() => {
    const handler = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area !== "local" || !("config" in changes)) return
      const cfg = changes["config"]?.newValue as
        | { onboardingDone?: boolean; panelWizardDone?: boolean }
        | undefined
      if (
        cfg?.onboardingDone &&
        !cfg?.panelWizardDone &&
        !panelWizardDismissed.current
      ) {
        setShowPanelWizard(true)
      }
    }
    chrome.storage.onChanged.addListener(handler)
    return () => chrome.storage.onChanged.removeListener(handler)
  }, [])

  // ── Theme (brightness + colour) — apply on load, keep in sync across tabs
  useEffect(() => {
    const COLOR_CLASSES = ["theme-red", "theme-blue", "theme-green"] as const

    const apply = (theme: string | undefined, color: string | undefined) => {
      const root = document.documentElement
      // Brightness
      if (theme === "dark") root.classList.add("dark")
      else if (theme === "light") root.classList.remove("dark")
      // Colour — red is the default (no class)
      if (color === "blue" || color === "green" || color === "red") {
        for (const c of COLOR_CLASSES) root.classList.remove(c)
        if (color !== "red") root.classList.add(`theme-${color}`)
      }
    }

    storage.local
      .get("config")
      .then((cfg) => {
        apply(cfg.theme ?? "light", cfg.themeColor ?? "red")
      })
      .catch(() => {})

    const onThemeChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area !== "local" || !("config" in changes)) return
      const next = changes["config"]?.newValue as
        | { theme?: string; themeColor?: string }
        | undefined
      apply(next?.theme, next?.themeColor)
    }
    chrome.storage.onChanged.addListener(onThemeChange)
    return () => chrome.storage.onChanged.removeListener(onThemeChange)
  }, [])

  // ── SortableJS ───────────────────────────────────────────────────────────
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

  // ── Tab helper ───────────────────────────────────────────────────────────
  const getTab = useCallback(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    return tab ?? null
  }, [])

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleHome = useCallback(async () => {
    const tab = await getTab()
    if (tab?.id != null)
      await chrome.tabs.update(tab.id, {
        url: chrome.runtime.getURL("newtab/index.html"),
      })
  }, [getTab])

  const handleBack = useCallback(async () => {
    const tab = await getTab()
    if (tab?.id == null) return
    const urlBefore = tab.url
    await (chrome.tabs as unknown as { goBack(id: number): Promise<void> })
      .goBack(tab.id)
      .catch(() => {})
    // Give Chrome a moment to start navigating, then check if anything moved.
    // If the URL is unchanged the tab was already at the beginning of its history.
    setTimeout(async () => {
      const after = await getTab()
      if (after?.url === urlBefore) showToast("Nothing to go back to", "error")
    }, 400)
  }, [getTab, showToast])

  const handleForward = useCallback(async () => {
    const tab = await getTab()
    if (tab?.id == null) return
    const urlBefore = tab.url
    await (chrome.tabs as unknown as { goForward(id: number): Promise<void> })
      .goForward(tab.id)
      .catch(() => {})
    setTimeout(async () => {
      const after = await getTab()
      if (after?.url === urlBefore)
        showToast("Nothing to go forward to", "error")
    }, 400)
  }, [getTab, showToast])

  const handleScrollTop = useCallback(async () => {
    const tab = await getTab()
    if (tab?.id != null) {
      chrome.tabs
        .sendMessage(tab.id, {
          type: "TAB_COMMAND",
          payload: { command: "scrollTop" },
        })
        .catch(() => {})
      setScrollPct(0) // optimistic — scroll to top resets position to 0
    }
  }, [getTab])

  const handleSetVolume = useCallback(
    async (level: number) => {
      setVolume(level)
      const tab = await getTab()
      if (tab?.id != null)
        chrome.tabs
          .sendMessage(tab.id, {
            type: "TAB_COMMAND",
            payload: { command: "setVolume", level },
          })
          .catch(() => {})
    },
    [getTab],
  )

  const handleScrollBy = useCallback(
    async (dir: 1 | -1) => {
      const tab = await getTab()
      if (tab?.id == null) return
      chrome.tabs.sendMessage(
        tab.id,
        { type: "TAB_COMMAND", payload: { command: "scrollBy", delta: dir } },
        (resp: { ok?: boolean; scrollPct?: number } | undefined) => {
          if (chrome.runtime.lastError) return
          if (resp != null && typeof resp.scrollPct === "number")
            setScrollPct(resp.scrollPct)
        },
      )
    },
    [getTab],
  )

  const refreshScrollPos = useCallback(async () => {
    const tab = await getTab()
    if (tab?.id == null) return
    chrome.tabs.sendMessage(
      tab.id,
      { type: "TAB_COMMAND", payload: { command: "getScrollPos" } },
      (resp: { ok?: boolean; scrollPct?: number } | undefined) => {
        if (chrome.runtime.lastError) return
        if (resp != null && typeof resp.scrollPct === "number")
          setScrollPct(resp.scrollPct)
      },
    )
  }, [getTab])

  const FONT_ZOOM: Record<FontSize, number> = {
    normal: 1,
    large: 1.25,
    xlarge: 1.5,
  }

  const handleZoom = useCallback(async () => {
    const nextIdx = (fontIdx + 1) % FONT_SIZES.length
    const next: FontSize = FONT_SIZES[nextIdx] ?? "normal"
    setFontIdx(nextIdx)
    await storage.session.set("currentFontSize", next)
    const tab = await getTab()
    if (tab?.id != null)
      await chrome.tabs.setZoom(tab.id, FONT_ZOOM[next]).catch(() => {})
  }, [fontIdx, getTab])

  const handleSave = useCallback(async () => {
    const tab = await getTab()
    if (!tab) return
    const url = tab.url ?? "",
      title = tab.title ?? url
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      showToast(
        "This page can't be saved. Try saving a website you're visiting.",
        "error",
      )
      return
    }
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
    // Log the save event so it appears in the caregiver's Activity Log.
    chrome.runtime
      .sendMessage({
        type: "LOG_ACTIVITY",
        payload: { url, title, type: "save" },
      })
      .catch(() => {})
    showToast(
      `Saved! ${caregiverName.current || "Your caregiver"} will see this.`,
    )
  }, [getTab])

  const handleExit = useCallback(async () => {
    if (isLastTab) {
      // Closing the last tab shuts down the whole browser — require confirmation.
      setShowCloseConfirm(true)
      return
    }
    const tab = await getTab()
    if (tab?.id != null) await chrome.tabs.remove(tab.id)
  }, [getTab, isLastTab])

  // chrome.windows.update is the programmatic F11 equivalent — works on every
  // page including the new tab (chrome-extension:// pages block executeScript).
  const handleFullscreen = useCallback(async () => {
    const win = await chrome.windows.getCurrent()
    if (!win.id) return
    const entering = win.state !== "fullscreen"
    await chrome.windows.update(win.id, {
      state: entering ? "fullscreen" : "normal",
    })
    setIsFullscreen(entering)
  }, [])

  const handleRefresh = useCallback(async () => {
    const tab = await getTab()
    if (tab?.id != null) chrome.tabs.reload(tab.id)
  }, [getTab])

  // ── Admin mode ───────────────────────────────────────────────────────────
  // Admin mode is entered from the newtab settings page (shared PIN).
  // The SW broadcasts ADMIN_MODE_CHANGED and the listener above updates state.
  // exitAdmin is still needed for the "Done" button inside the panel.
  const exitAdmin = useCallback(() => {
    setAdminMode(false)
    chrome.runtime
      .sendMessage({ type: "SET_ADMIN_MODE", payload: { active: false } })
      .catch(() => {})
  }, [])

  const handleLabelChange = useCallback((id: string, label: string) => {
    setBtnCfgs((prev) => {
      const base = prev[id] ??
        DEFAULT_PANEL_BUTTONS[id] ?? { label, visible: true }
      const next = { ...prev, [id]: { ...base, label } }
      void storage.local.update("config", { panelButtons: next })
      return next
    })
  }, [])

  const handleVisibility = useCallback((id: string) => {
    setBtnCfgs((prev) => {
      const cur = prev[id] ??
        DEFAULT_PANEL_BUTTONS[id] ?? { label: id, visible: true }
      const visCount = Object.values(prev).filter((c) => c.visible).length
      if (cur.visible && visCount <= 1) return prev
      const next = { ...prev, [id]: { ...cur, visible: !cur.visible } }
      void storage.local.update("config", { panelButtons: next })
      return next
    })
  }, [])

  // ── Derived ──────────────────────────────────────────────────────────────
  const currentSize: FontSize = FONT_SIZES[fontIdx] ?? "normal"

  const visible = (id: string) => btnCfgs[id]?.visible ?? true
  const label = (id: string, fallback: string) => btnCfgs[id]?.label ?? fallback

  const handlers: Record<string, () => void> = {
    home: handleHome,
    back: handleBack,
    forward: handleForward,
    scrollTop: handleScrollTop,
    zoom: handleZoom,
    save: handleSave,
    fullscreen: handleFullscreen,
    refresh: handleRefresh,
    exit: handleExit,
  }

  // ── Scroll position sync (must be after refreshScrollPos is declared) ────
  useEffect(() => {
    void refreshScrollPos()
  }, [refreshScrollPos])

  useEffect(() => {
    const onActivated = () => {
      void refreshScrollPos()
    }
    chrome.tabs.onActivated.addListener(onActivated)
    return () => chrome.tabs.onActivated.removeListener(onActivated)
  }, [refreshScrollPos])

  // `scroll` and `volume` are rendered as special tiles — not in handlers

  // Mid buttons (no home, no exit) in stored order, visible only
  const midIds = btnOrder.filter(
    (id) => id !== "home" && id !== "exit" && visible(id),
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        // Definite, bounded height: fills the viewport but never less than
        // 768px (below that the body scrolls). Using `height` instead of
        // `min-height` is critical so the inner grid's 1fr rows have a
        // definite container to divide — otherwise intrinsic content
        // from VolumeControlTile / ScrollControlTile pushes the panel
        // taller than 768.
        height: "max(100vh, 768px)",
        background: "var(--sw-bg)",
      }}
    >
      {/* Edit-mode banner */}
      {adminMode && (
        <div
          style={{
            padding: "10px 14px",
            flexShrink: 0,
            background: "var(--sw-accent-btn)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          <span>Edit mode — rearrange shortcuts</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => {
                exitAdmin()
                setShowPanelWizard(true)
              }}
              title="Restart the panel tour"
              style={{
                background: "rgba(255,255,255,0.22)",
                border: "none",
                color: "inherit",
                borderRadius: 6,
                padding: "4px 10px",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.32)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.22)"
              }}
            >
              <ArrowCounterClockwiseIcon size={12} weight="bold" /> Tour
            </button>
            <button
              onClick={exitAdmin}
              style={{
                background: "rgba(255,255,255,0.22)",
                border: "none",
                color: "inherit",
                borderRadius: 6,
                padding: "4px 12px",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.32)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.22)"
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Tile area — fills remaining height; tiles inside flex via grid */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          padding: "8px",
          display: "flex",
          flexDirection: "column",
          gap: 0,
        }}
      >
        {adminMode ? (
          /* ── Admin drag list ── */
          <div
            ref={listRef}
            style={{ display: "flex", flexDirection: "column", gap: 4 }}
          >
            {btnOrder.map((id) => (
              <AdminRow
                key={id}
                id={id}
                cfg={
                  btnCfgs[id] ??
                  DEFAULT_PANEL_BUTTONS[id] ?? { label: id, visible: true }
                }
                isPrimary={id === "home"}
                onLabelChange={handleLabelChange}
                onVisibilityToggle={handleVisibility}
              />
            ))}
          </div>
        ) : (
          /* ── Normal tile grid ──
             grid-auto-rows: minmax(0, 1fr) gives every row an equal share
             of the container's height, so tiles scale up/down with the
             panel size (the App root enforces min-height: 768). */
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
              gridAutoRows: "minmax(0, 1fr)",
              gap: 6,
              flex: 1,
              minHeight: 0,
            }}
          >
            {/* Home — full-width primary */}
            {visible("home") && (
              <Tile
                id="home"
                label={label("home", "HOME")}
                icon={<HouseIcon size={28} weight="bold" />}
                onClick={handleHome}
                variant="primary"
                fullWidth
                tourTarget="home"
              />
            )}

            {/* Mid buttons fill the 2-col grid */}
            {midIds.map((id) => {
              if (id === "zoom") {
                return (
                  <ZoomTile
                    key={id}
                    label={label("zoom", "TEXT SIZE")}
                    currentSize={currentSize}
                    onClick={handleZoom}
                    disabled={false}
                  />
                )
              }
              if (id === "volume") {
                return (
                  <VolumeControlTile
                    key={id}
                    label={label("volume", "VOLUME")}
                    volume={volume}
                    onSet={handleSetVolume}
                  />
                )
              }
              if (id === "scroll") {
                return (
                  <ScrollControlTile
                    key={id}
                    label={label("scroll", "MOVE PAGE")}
                    scrollPct={scrollPct}
                    onScrollBy={handleScrollBy}
                    onScrollTop={handleScrollTop}
                  />
                )
              }
              if (id === "fullscreen") {
                return (
                  <Tile
                    key={id}
                    id={id}
                    label={
                      isFullscreen
                        ? "SHRINK"
                        : label("fullscreen", "FULLSCREEN")
                    }
                    labelFontSize="1.2rem"
                    icon={
                      isFullscreen ? (
                        <ArrowsInIcon size={28} weight="bold" />
                      ) : (
                        <ArrowsOutIcon size={28} weight="bold" />
                      )
                    }
                    onClick={handleFullscreen}
                    variant={isFullscreen ? "primary" : "default"}
                    tourTarget={id}
                  />
                )
              }
              return (
                <Tile
                  key={id}
                  id={id}
                  label={label(id, id)}
                  icon={PHOSPHOR[id]}
                  onClick={handlers[id] ?? (() => {})}
                  tourTarget={id}
                />
              )
            })}

            {/* Exit — full-width danger at bottom */}
            {visible("exit") && (
              <Tile
                id="exit"
                // isLastTab always wins, even over a caregiver-customised
                // label — label("exit", ...)'s fallback never applies here
                // since DEFAULT_PANEL_BUTTONS.exit.label is never nullish,
                // and this warning must never be hidden by a customisation.
                label={isLastTab ? "CLOSE BROWSER" : label("exit", "CLOSE PAGE")}
                icon={<XCircleIcon size={28} weight="bold" />}
                onClick={handleExit}
                variant="danger"
                fullWidth
                tourTarget="exit"
              />
            )}
          </div>
        )}
      </div>

      {/* Close-browser confirmation — only shown when closing the last tab */}
      {showCloseConfirm && (
        <CloseBrowserConfirm
          onConfirm={async () => {
            setShowCloseConfirm(false)
            const tab = await getTab()
            if (tab?.id != null) await chrome.tabs.remove(tab.id)
          }}
          onCancel={() => setShowCloseConfirm(false)}
        />
      )}

      {/* Floating toast — sits above everything */}
      <FloatingToast toast={toast} onClose={closeToast} />

      {/* Panel spotlight wizard — portal-rendered so it overlays the real tiles */}
      {showPanelWizard && (
        <PanelWizard
          onDone={() => {
            panelWizardDismissed.current = true
            setShowPanelWizard(false)
            void storage.local.update("config", { panelWizardDone: true })
            // Hand off to the newtab — start the senior walkthrough there next.
            chrome.storage.session
              .set({ seniorTourPending: true })
              .catch(() => {})
          }}
          onSkip={() => {
            // Dismissed early — mark done and still hand off to the homescreen
            // senior walkthrough so it always runs regardless of skip/complete.
            panelWizardDismissed.current = true
            setShowPanelWizard(false)
            void storage.local.update("config", { panelWizardDone: true })
            chrome.storage.session
              .set({ seniorTourPending: true })
              .catch(() => {})
          }}
        />
      )}
    </div>
  )
}
