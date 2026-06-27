import { useRef, useState } from "react"
import { storage, type DeepPartial } from "@shared/storage"
import type { ToastType } from "@shared/toast"
import type {
  ActivityLogEntry,
  Config,
  SavedLink,
  Shortcut,
} from "@shared/types"

const BACKUP_VERSION = 2

/** Lightweight structural check — enough to reject random JSON without being
 *  so strict that we reject a slightly-different export version. */
function isValidBackup(v: unknown): v is BackupFile {
  if (!v || typeof v !== "object") return false
  const o = v as Record<string, unknown>
  if (typeof o.exportedAt !== "string") return false
  if (typeof o.version !== "number") return false
  // At least one of the recognised data sections must be present and an array.
  const hasShortcuts = Array.isArray(o.shortcuts)
  const hasSavedLinks = Array.isArray(o.savedLinks)
  const hasActivityLog = Array.isArray(o.activityLog)
  if (!hasShortcuts && !hasSavedLinks && !hasActivityLog) return false
  // shortcuts items, if present, must have id + url at minimum.
  if (hasShortcuts) {
    const items = o.shortcuts as unknown[]
    for (const item of items) {
      if (!item || typeof item !== "object") return false
      const it = item as Record<string, unknown>
      if (typeof it.id !== "string" || typeof it.url !== "string") return false
    }
  }
  return true
}

interface BackupFile {
  exportedAt: string
  version: number
  shortcuts: Shortcut[]
  savedLinks: SavedLink[]
  activityLog: ActivityLogEntry[]
  config?: Partial<Config>
  // Legacy field from v1 backups — kept for backward compatibility on import.
  profile?: { seniorName?: string; caregiverName?: string }
}

interface BackupPreview {
  data: BackupFile
  shortcutCount: number
  savedLinkCount: number
  activityCount: number
  exportedDate: string
}

export function ExportDataWidget({
  showToast,
}: {
  showToast: (msg: string, type?: ToastType) => void
}) {
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState<BackupPreview | null>(null)
  const [parseError, setParseError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    setExporting(true)
    try {
      const [shortcuts, savedLinks, activityLog, config] = await Promise.all([
        storage.local.get("shortcuts"),
        storage.local.get("savedLinks"),
        storage.local.get("activityLog"),
        storage.local.get("config"),
      ])
      const data: BackupFile = {
        exportedAt: new Date().toISOString(),
        version: BACKUP_VERSION,
        shortcuts,
        savedLinks,
        activityLog,
        config,
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `seniorbrowse-backup-${new Date().toISOString().slice(0, 10)}.json`
      // Some Chrome versions require the anchor to be in the DOM for
      // programmatic clicks to trigger the download.
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      // Revoke after a short delay so Chrome can finish reading the blob.
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      showToast("Backup saved")
    } catch (err) {
      console.error("[SeniorBrowse] backup export failed", err)
      showToast("Saving failed — please try again", "error")
    } finally {
      setExporting(false)
    }
  }

  const handleFile = async (file: File) => {
    setParseError("")
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as unknown
      // Validate structure
      if (!isValidBackup(parsed)) {
        setParseError(
          "This doesn't look like a SeniorBrowse backup file. Make sure you picked the right .json file.",
        )
        return
      }
      const data = parsed as BackupFile
      const dt = new Date(data.exportedAt)
      const dateStr = isNaN(dt.getTime())
        ? "Unknown date"
        : dt.toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
      setPreview({
        data,
        shortcutCount: data.shortcuts?.length ?? 0,
        savedLinkCount: data.savedLinks?.length ?? 0,
        activityCount: data.activityLog?.length ?? 0,
        exportedDate: dateStr,
      })
    } catch {
      setParseError(
        "That file couldn't be read. It may be damaged or in the wrong format.",
      )
    }
  }

  const confirmRestore = async () => {
    if (!preview) return
    setImporting(true)
    try {
      const { data } = preview
      const writes: Promise<unknown>[] = []
      if (Array.isArray(data.shortcuts)) {
        writes.push(storage.local.set("shortcuts", data.shortcuts))
      }
      if (Array.isArray(data.savedLinks)) {
        writes.push(storage.local.set("savedLinks", data.savedLinks))
      }
      if (Array.isArray(data.activityLog)) {
        writes.push(storage.local.set("activityLog", data.activityLog))
      }
      // Config — v2 stores the whole thing under `config`; v1 only had
      // `profile`. Merge against the current config so new fields stay set.
      if (data.config && typeof data.config === "object") {
        writes.push(
          storage.local.update("config", data.config as DeepPartial<Config>),
        )
      } else if (data.profile) {
        writes.push(
          storage.local.update("config", {
            seniorName: data.profile.seniorName ?? "",
            caregiverName: data.profile.caregiverName ?? "",
          }),
        )
      }
      await Promise.all(writes)
      showToast("Backup restored — refreshing…")
      setPreview(null)
      // Refresh so all in-memory caches reload from the restored data.
      setTimeout(() => window.location.reload(), 700)
    } catch (err) {
      console.error("[SeniorBrowse] backup import failed", err)
      showToast("Restore failed — please try again", "error")
      setImporting(false)
    }
  }

  const openFilePicker = () => {
    setParseError("")
    fileInputRef.current?.click()
  }

  return (
    <div
      style={{
        padding: "1rem",
        borderRadius: 12,
        background: "var(--color-surface)",
        border: "1.5px solid var(--color-surface-edge)",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
      }}
    >
      <div>
        <div
          style={{
            fontWeight: 600,
            fontSize: "0.95rem",
            color: "var(--color-text)",
          }}
        >
          Backup &amp; restore
        </div>
        <div
          style={{
            fontSize: "0.875rem",
            color: "var(--color-text-muted)",
            marginTop: 2,
          }}
        >
          Save your shortcuts, saved pages and settings to a file — or restore
          from one you saved earlier.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.6rem",
        }}
      >
        <button
          type="button"
          disabled={exporting || importing}
          onClick={() => void handleExport()}
          style={{
            padding: "0.65rem 1rem",
            borderRadius: 10,
            background: "var(--color-bg)",
            color: "var(--color-text)",
            border: "1.5px solid var(--color-surface-edge)",
            fontSize: "0.9rem",
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: exporting || importing ? "default" : "pointer",
            whiteSpace: "nowrap" as const,
            transition: "background 0.15s, border-color 0.15s",
            opacity: exporting || importing ? 0.6 : 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
          }}
          onMouseEnter={(e) => {
            if (!exporting && !importing) {
              e.currentTarget.style.borderColor = "var(--color-accent)"
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--color-surface-edge)"
          }}
        >
          {exporting ? (
            "Saving…"
          ) : (
            <>
              <span aria-hidden="true">⬇</span> Save backup
            </>
          )}
        </button>

        <button
          type="button"
          disabled={exporting || importing}
          onClick={openFilePicker}
          style={{
            padding: "0.65rem 1rem",
            borderRadius: 10,
            background: "var(--color-bg)",
            color: "var(--color-text)",
            border: "1.5px solid var(--color-surface-edge)",
            fontSize: "0.9rem",
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: exporting || importing ? "default" : "pointer",
            whiteSpace: "nowrap" as const,
            transition: "background 0.15s, border-color 0.15s",
            opacity: exporting || importing ? 0.6 : 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
          }}
          onMouseEnter={(e) => {
            if (!exporting && !importing) {
              e.currentTarget.style.borderColor = "var(--color-accent)"
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--color-surface-edge)"
          }}
        >
          <span aria-hidden="true">⬆</span> Load backup…
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          aria-label="Choose backup file"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.currentTarget.files?.[0]
            if (f) void handleFile(f)
            // Reset so picking the same file twice re-triggers onChange.
            e.currentTarget.value = ""
          }}
        />
      </div>

      {parseError && (
        <p
          role="alert"
          style={{
            margin: 0,
            padding: "0.6rem 0.75rem",
            borderRadius: 10,
            background: "var(--color-danger-light)",
            color: "var(--color-danger)",
            fontSize: "0.875rem",
            lineHeight: 1.4,
          }}
        >
          {parseError}
        </p>
      )}

      {/* Inline confirmation panel when a valid file is picked */}
      {preview && (
        <div
          role="dialog"
          aria-labelledby="restore-confirm-title"
          style={{
            marginTop: "0.25rem",
            padding: "0.9rem 1rem",
            borderRadius: 12,
            background: "var(--color-accent-xlight)",
            border: "2px solid var(--color-accent)",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <div>
            <div
              id="restore-confirm-title"
              style={{
                fontWeight: 700,
                fontSize: "0.95rem",
                color: "var(--color-text)",
                marginBottom: "0.35rem",
              }}
            >
              Restore this backup?
            </div>
            <div
              style={{
                fontSize: "0.85rem",
                color: "var(--color-text-muted)",
                lineHeight: 1.5,
              }}
            >
              From <strong>{preview.exportedDate}</strong> ·{" "}
              {preview.shortcutCount} shortcuts, {preview.savedLinkCount} saved
              pages, {preview.activityCount} log entries.
            </div>
            <div
              style={{
                marginTop: "0.4rem",
                fontSize: "0.82rem",
                color: "var(--color-danger)",
                fontWeight: 600,
              }}
            >
              This will replace your current shortcuts, saved pages and
              settings.
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => setPreview(null)}
              disabled={importing}
              style={{
                padding: "0.55rem 1rem",
                borderRadius: 10,
                background: "transparent",
                color: "var(--color-text-muted)",
                border: "1.5px solid var(--color-surface-edge)",
                fontSize: "0.875rem",
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: importing ? "default" : "pointer",
                opacity: importing ? 0.6 : 1,
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirmRestore()}
              disabled={importing}
              style={{
                padding: "0.55rem 1.1rem",
                borderRadius: 10,
                background: "var(--color-accent)",
                color: "#fff",
                border: "none",
                fontSize: "0.9rem",
                fontWeight: 700,
                fontFamily: "inherit",
                cursor: importing ? "default" : "pointer",
                opacity: importing ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!importing) {
                  e.currentTarget.style.background =
                    "var(--color-accent-strong)"
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--color-accent)"
              }}
            >
              {importing ? "Restoring…" : "Yes, restore"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
