// Features: drag-to-reorder, resize, add shortcut, delete + undo

import { useEffect, useRef, useState } from "react"
import { PlusIcon } from "@phosphor-icons/react"
import Sortable from "sortablejs"
import { storage } from "@shared/storage"
import { UNDO_TOAST_MS } from "@shared/constants"
import { Mark } from "@shared/Mark"
import type { Shortcut, ShortcutSize } from "@shared/types"
import { ViewTile } from "./shortcuts/ViewTile"
import { AdminTile } from "./shortcuts/AdminTile"
import { SizeControl } from "./shortcuts/SizeControl"
import { DeleteConfirmModal } from "./shortcuts/DeleteConfirmModal"
import { AddShortcutForm } from "./shortcuts/AddShortcutForm"
import { UndoToast } from "./shortcuts/UndoToast"

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

  // ── SortableJS ─────────────────────────────────────────────────────────────
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
    // config keys are not silently overwritten.
    await storage.local.update("config", { shortcutSize: size })
  }

  // ── Delete + undo ──────────────────────────────────────────────────────────
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
    // This prevents undo from clobbering shortcuts added after the delete.
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

  // ── Add ────────────────────────────────────────────────────────────────────
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

      {/* Centred delete confirmation modal */}
      {pendingDelete && (
        <DeleteConfirmModal
          shortcut={pendingDelete}
          onConfirm={() => handleDelete(pendingDelete.id)}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {/* Add shortcut form with popular + visited chips */}
      {showAddForm && (
        <AddShortcutForm
          existingUrls={existingHostnames}
          onAdd={handleAdd}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Undo toast */}
      {undoSnap && (
        <UndoToast label={undoSnap.deletedLabel} onUndo={handleUndo} />
      )}
    </>
  )
}
