// M-01: SettingsModal shell + tabs
// M-02: Profile tab
// M-03: Security tab
// M-04: Saved Links tab
// M-05: Activity Log tab
// M-06: Trial tab

import { useCallback, useEffect, useRef, useState } from "react"
import { useFocusTrap } from "@shared/useFocusTrap"
import {
  ArrowRightIcon,
  BookmarkSimpleIcon,
  CheckIcon,
  ClipboardTextIcon,
  CreditCardIcon,
  GlobeIcon,
  HourglassIcon,
  KeyIcon,
  LockSimpleIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  PaletteIcon,
  PlusIcon,
  ShieldCheckIcon,
  StarIcon,
  SunIcon,
  TrashIcon,
  UserIcon,
  XIcon,
} from "@phosphor-icons/react"
import { storage, type DeepPartial } from "@shared/storage"
import { SUSPICIOUS_LINK_MODES, MAX_LOG_AGE_DAYS } from "@shared/constants"
import { hashPin } from "@shared/pin"
import { FloatingToast, useToast } from "@shared/toast"
import type { ToastType } from "@shared/toast"
import type {
  ActivityLogEntry,
  Config,
  SavedLink,
  Shortcut,
  ShortcutSize,
  Subscription,
  SuspiciousLinkMode,
  Theme,
  ThemeColor,
} from "@shared/types"
import { ThemeColorPicker } from "./ThemeColorPicker"
import { applyTheme } from "../hooks/useTheme"

// ── Shared primitives ─────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        width: 48,
        height: 28,
        borderRadius: 14,
        flexShrink: 0,
        background: checked
          ? "var(--color-accent)"
          : "var(--color-surface-edge)",
        border: "none",
        cursor: "pointer",
        padding: 0,
        transition: "background 0.22s",
        boxShadow: checked ? "0 0 0 3px var(--color-accent-light)" : "none",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 23 : 3,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.22s cubic-bezier(0.22,1,0.36,1)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.22)",
        }}
      />
    </button>
  )
}

function SettingRow({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "1rem",
        padding: "0.85rem 1rem",
        borderRadius: "var(--radius-sm)",
        marginBottom: "0.25rem",
        background: "var(--color-surface)",
        border: "1.5px solid var(--color-surface-edge)",
      }}
    >
      <div>
        <div
          style={{
            fontWeight: 600,
            fontSize: "0.95rem",
            color: "var(--color-text)",
            lineHeight: 1.3,
          }}
        >
          {label}
        </div>
        {hint && (
          <div
            style={{
              fontSize: "0.8rem",
              color: "var(--color-text-muted)",
              marginTop: 3,
              lineHeight: 1.4,
            }}
          >
            {hint}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
      <span
        style={{
          fontWeight: 600,
          fontSize: "0.88rem",
          color: "var(--color-text-muted)",
          textTransform: "uppercase" as const,
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  )
}

const textInput: React.CSSProperties = {
  padding: "0.65rem 0.9rem",
  borderRadius: 10,
  border: "1.5px solid var(--color-surface-edge)",
  background: "var(--color-surface-raised)",
  fontSize: "1rem",
  fontFamily: "inherit",
  color: "var(--color-text)",
  width: "100%",
  transition: "border-color 0.15s",
}

const textArea: React.CSSProperties = {
  ...textInput,
  fontFamily: "inherit",
  resize: "vertical" as const,
  minHeight: 90,
}

function SaveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        marginTop: "1rem",
        padding: "0.7rem 1.5rem",
        background: "var(--color-accent)",
        color: "#fff",
        border: "none",
        borderRadius: "var(--radius-pill)",
        fontSize: "0.95rem",
        fontWeight: 700,
        cursor: "pointer",
        transition:
          "background 0.22s cubic-bezier(0.22,1,0.36,1), transform 0.22s cubic-bezier(0.22,1,0.36,1)",
        alignSelf: "flex-start",
        letterSpacing: "0.01em",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--color-accent-strong)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--color-accent)"
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = "scale(0.97)"
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "scale(1)"
      }}
    >
      Save changes
    </button>
  )
}

const PIN_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["⌫", "0"],
] as const

// ── PIN change widget ─────────────────────────────────────────────────────────

type PinStep = "idle" | "enter" | "confirm"

function PinChangeWidget({
  showToast,
}: {
  showToast: (msg: string, type?: ToastType) => void
}) {
  const [step, setStep] = useState<PinStep>("idle")
  const [digits, setDigits] = useState<string[]>([])
  const [error, setError] = useState("")
  const [shake, setShake] = useState(false)
  const firstPinRef = useRef("")

  const reset = () => {
    setStep("idle")
    setDigits([])
    firstPinRef.current = ""
    setError("")
    setShake(false)
  }

  const press = (key: string) => {
    if (shake) return
    if (key === "⌫") {
      setDigits((p) => p.slice(0, -1))
      setError("")
      return
    }
    setDigits((p) => (p.length < 4 ? [...p, key] : p))
  }

  // Auto-advance / confirm when 4 digits filled
  useEffect(() => {
    if (digits.length !== 4 || shake) return
    if (step === "enter") {
      firstPinRef.current = digits.join("")
      setTimeout(() => {
        setDigits([])
        setStep("confirm")
      }, 100)
    } else if (step === "confirm") {
      if (digits.join("") === firstPinRef.current) {
        void hashPin(firstPinRef.current)
          .then(({ pinHash, pinSalt }) =>
            storage.local.update("config", { pinHash, pinSalt }),
          )
          .then(() => {
            showToast("PIN changed successfully")
            reset()
          })
      } else {
        setShake(true)
        setError("PINs don't match — try again")
        setTimeout(() => {
          setShake(false)
          setError("")
          setDigits([])
          firstPinRef.current = ""
          setStep("enter")
        }, 900)
      }
    }
    // digits.length triggers the CheckIcon; step/firstPinRef are correct by the time length hits 4
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits.length])

  // Keyboard support while numpad is open
  useEffect(() => {
    if (step === "idle") return
    const onKey = (e: KeyboardEvent) => {
      if (shake) return
      if (e.key >= "0" && e.key <= "9")
        setDigits((p) => (p.length < 4 ? [...p, e.key] : p))
      else if (e.key === "Backspace") {
        setDigits((p) => p.slice(0, -1))
        setError("")
      } else if (e.key === "Escape") reset()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [step, shake])

  if (step === "idle") {
    return (
      <button
        type="button"
        onClick={() => setStep("enter")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.45rem",
          padding: "0.6rem 1.1rem",
          borderRadius: 10,
          border: "1.5px solid var(--color-surface-edge)",
          background: "var(--color-bg)",
          fontSize: "0.9rem",
          fontWeight: 600,
          fontFamily: "inherit",
          cursor: "pointer",
          color: "var(--color-text)",
          transition: "border-color 0.15s, background 0.15s",
          alignSelf: "flex-start",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--color-accent-light)"
          e.currentTarget.style.background = "var(--color-accent-xlight)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--color-surface-edge)"
          e.currentTarget.style.background = "var(--color-bg)"
        }}
      >
        <KeyIcon size={15} weight="bold" /> Change PIN
      </button>
    )
  }

  const heading = step === "enter" ? "Enter new PIN" : "Confirm new PIN"
  const subtext =
    step === "enter" ? "Choose a new 4-digit PIN" : "Type the same PIN again"

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.9rem",
        padding: "1.15rem",
        borderRadius: 14,
        background: "var(--color-bg)",
        border: "1.5px solid var(--color-surface-edge)",
        animation: shake ? "sw-shake 0.42s ease" : "none",
      }}
    >
      {/* Step header */}
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 700,
              fontSize: "0.975rem",
              color: "var(--color-text)",
            }}
          >
            {heading}
          </div>
          <div
            style={{
              fontSize: "0.8rem",
              color: "var(--color-text-muted)",
              marginTop: 2,
            }}
          >
            {subtext}
          </div>
        </div>
        <button
          type="button"
          onClick={reset}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-muted)",
            fontSize: "0.875rem",
            fontWeight: 600,
            fontFamily: "inherit",
            padding: "0 0.75rem",
            minHeight: 44,
            borderRadius: 8,
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          Cancel
        </button>
      </div>

      {/* Step progress pills */}
      <div style={{ display: "flex", gap: 5 }}>
        {(["enter", "confirm"] as const).map((s) => (
          <div
            key={s}
            style={{
              height: 6,
              borderRadius: 3,
              width: step === s ? 22 : 10,
              background:
                step === s || (s === "enter" && step === "confirm")
                  ? "var(--color-accent)"
                  : "var(--color-surface-edge)",
              transition: "width 0.2s, background 0.2s",
            }}
          />
        ))}
      </div>

      {/* Dot indicators */}
      <div style={{ display: "flex", gap: 12 }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background:
                digits.length > i
                  ? error
                    ? "var(--color-accent)"
                    : "var(--color-text)"
                  : "transparent",
              border: `2px solid ${
                error
                  ? "var(--color-accent)"
                  : digits.length > i
                    ? "var(--color-text)"
                    : "var(--color-surface-edge)"
              }`,
              transition: "background 0.15s, border-color 0.15s",
            }}
          />
        ))}
      </div>

      {error && (
        <p
          style={{
            margin: 0,
            fontSize: "0.875rem",
            color: "var(--color-accent)",
            fontWeight: 600,
          }}
        >
          {error}
        </p>
      )}

      {/* Numpad */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 5,
          width: "100%",
        }}
      >
        {PIN_ROWS.map((row, ri) => (
          <div
            key={ri}
            style={{
              display: "flex",
              gap: 5,
              justifyContent: row.length < 3 ? "center" : "stretch",
            }}
          >
            {row.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => press(key)}
                disabled={shake}
                style={{
                  flex: row.length === 3 ? 1 : undefined,
                  width: row.length < 3 ? 68 : undefined,
                  height: 52,
                  fontSize: key === "⌫" ? "1.1rem" : "1.25rem",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  background: "var(--color-surface)",
                  border: "1.5px solid var(--color-surface-edge)",
                  borderRadius: 10,
                  cursor: shake ? "default" : "pointer",
                  color: "var(--color-text)",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => {
                  if (!shake)
                    e.currentTarget.style.background =
                      "var(--color-surface-raised)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--color-surface)"
                }}
              >
                {key}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── M-02 Profile tab ──────────────────────────────────────────────────────────

interface ProfileTabProps {
  onStartSeniorTour: () => void
  showToast: (msg: string, type?: ToastType) => void
}

function ProfileTab({ onStartSeniorTour, showToast }: ProfileTabProps) {
  const [seniorName, setSeniorName] = useState("")
  const [caregiverName, setCaregiverName] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    storage.local
      .get("config")
      .then((c) => {
        setSeniorName(c.seniorName)
        setCaregiverName(c.caregiverName)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  const saveField = async (
    field: "seniorName" | "caregiverName",
    value: string,
  ) => {
    await storage.local.update("config", { [field]: value.trim() })
    showToast("Name saved")
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <p
        style={{
          margin: 0,
          color: "var(--color-text-muted)",
          fontSize: "0.9rem",
        }}
      >
        These names are used in greetings and confirmation messages.
      </p>

      <Field label="Senior's name">
        <input
          type="text"
          value={seniorName}
          style={textInput}
          placeholder="e.g. Halina"
          onChange={(e) => setSeniorName((e.target as HTMLInputElement).value)}
          onBlur={() => saveField("seniorName", seniorName)}
        />
      </Field>

      <Field label="Caregiver's name">
        <input
          type="text"
          value={caregiverName}
          style={textInput}
          placeholder="e.g. Magda"
          onChange={(e) =>
            setCaregiverName((e.target as HTMLInputElement).value)
          }
          onBlur={() => saveField("caregiverName", caregiverName)}
        />
      </Field>

      {/* O-02: start senior walkthrough */}
      <div
        style={{
          marginTop: "0.5rem",
          padding: "1rem",
          borderRadius: 12,
          background: "var(--color-surface)",
          border: "1.5px solid var(--color-surface-edge)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
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
            Senior quick tour
          </div>
          <div
            style={{
              fontSize: "0.875rem",
              color: "var(--color-text-muted)",
              marginTop: 2,
            }}
          >
            A friendly 5-step walkthrough to do together
          </div>
        </div>
        <button
          type="button"
          onClick={onStartSeniorTour}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: 10,
            background: "var(--color-accent)",
            color: "#fff",
            border: "none",
            fontSize: "0.9rem",
            fontWeight: 700,
            cursor: "pointer",
            whiteSpace: "nowrap" as const,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--color-accent-strong)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--color-accent)"
          }}
        >
          Start tour <ArrowRightIcon size={15} />
        </button>
      </div>

      {/* Change admin PIN */}
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
            <LockSimpleIcon
              size={16}
              style={{ verticalAlign: "middle", marginRight: "0.3rem" }}
            />{" "}
            Admin PIN
          </div>
          <div
            style={{
              fontSize: "0.875rem",
              color: "var(--color-text-muted)",
              marginTop: 2,
            }}
          >
            4-digit code required to access caregiver settings. Default is{" "}
            <strong>1234</strong> — change it now.
          </div>
        </div>

        <PinChangeWidget showToast={showToast} />
      </div>

      {/* Appearance — accent colour + light/dark */}
      <AppearanceWidget showToast={showToast} />

      {/* MF-04: Export / backup data */}
      <ExportDataWidget showToast={showToast} />
    </div>
  )
}

// ── Appearance widget — accent colour picker + light/dark toggle ─────────────

function AppearanceWidget({
  showToast,
}: {
  showToast: (msg: string, type?: ToastType) => void
}) {
  const [theme, setTheme] = useState<Theme>("light")
  const [color, setColor] = useState<ThemeColor>("red")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    storage.local
      .get("config")
      .then((c) => {
        setTheme(c.theme ?? "light")
        setColor(c.themeColor ?? "red")
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return null

  const updateColor = async (next: ThemeColor) => {
    setColor(next)
    applyTheme(theme, next)
    await storage.local.update("config", { themeColor: next })
    showToast("Colour updated")
  }

  const toggleBrightness = async () => {
    const next: Theme = theme === "dark" ? "light" : "dark"
    setTheme(next)
    applyTheme(next, color)
    await storage.local.update("config", { theme: next })
  }

  const isDark = theme === "dark"

  return (
    <div
      style={{
        padding: "1rem",
        borderRadius: 12,
        background: "var(--color-surface)",
        border: "1.5px solid var(--color-surface-edge)",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <div>
        <div
          id="appearance-title"
          style={{
            fontWeight: 600,
            fontSize: "0.95rem",
            color: "var(--color-text)",
          }}
        >
          <PaletteIcon
            size={16}
            style={{ verticalAlign: "middle", marginRight: "0.3rem" }}
          />{" "}
          Appearance
        </div>
        <div
          style={{
            fontSize: "0.875rem",
            color: "var(--color-text-muted)",
            marginTop: 2,
          }}
        >
          Pick an accent colour and choose between light or dark.
        </div>
      </div>

      <ThemeColorPicker
        value={color}
        onChange={updateColor}
        labelledBy="appearance-title"
      />

      {/* Brightness — segmented light / dark control */}
      <div
        role="radiogroup"
        aria-label="Brightness"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.5rem",
          padding: "0.3rem",
          borderRadius: "var(--radius-md)",
          background: "var(--color-bg)",
          border: "1.5px solid var(--color-surface-edge)",
        }}
      >
        {(["light", "dark"] as const).map((mode) => {
          const active = (mode === "dark") === isDark
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                if (mode === "dark" ? !isDark : isDark) toggleBrightness()
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
                padding: "0.55rem 0.75rem",
                borderRadius: "calc(var(--radius-md) - 4px)",
                border: "none",
                background: active
                  ? "var(--color-surface-raised)"
                  : "transparent",
                color: active
                  ? "var(--color-text)"
                  : "var(--color-text-muted)",
                fontWeight: active ? 700 : 600,
                fontSize: "0.9rem",
                fontFamily: "inherit",
                cursor: "pointer",
                boxShadow: active ? "var(--shadow-sm)" : "none",
                transition: "background 0.18s, color 0.18s, box-shadow 0.18s",
              }}
            >
              {mode === "light" ? (
                <SunIcon size={16} weight={active ? "fill" : "regular"} />
              ) : (
                <MoonIcon size={16} weight={active ? "fill" : "regular"} />
              )}
              {mode === "light" ? "Light" : "Dark"}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── MF-04 Backup widget — save and restore ───────────────────────────────────

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

function ExportDataWidget({
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
      // Strip the subscription/license fields from the config — they're
      // device-bound and shouldn't move between installs.
      const data: BackupFile = {
        exportedAt: new Date().toISOString(),
        version: BACKUP_VERSION,
        shortcuts,
        savedLinks,
        activityLog,
        // Full config — no subscription/license here (those live separately).
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
      // Restore the data. Subscription stays untouched (device-bound).
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

// ── M-03 Security tab ─────────────────────────────────────────────────────────

const LINK_MODE_LABELS: Record<
  SuspiciousLinkMode,
  { title: string; desc: string }
> = {
  block: {
    title: "Block dangerous sites",
    desc: "Automatically block known threats",
  },
  warn: {
    title: "Warn before visiting",
    desc: "Show a warning with option to continue",
  },
  off: { title: "Off", desc: "No link checking" },
}

function SecurityTab({
  showToast,
}: {
  showToast: (msg: string, type?: ToastType) => void
}) {
  const [cfg, setCfg] = useState<Config["security"] | null>(null)
  const [wl, setWl] = useState("") // whitelist textarea
  const [bl, setBl] = useState("") // blacklist textarea

  useEffect(() => {
    storage.local
      .get("config")
      .then((c) => {
        setCfg(c.security)
        setWl(c.security.whitelist.join("\n"))
        setBl(c.security.blacklist.join("\n"))
      })
      .catch(() => {})
  }, [])

  if (!cfg) return <Spinner />

  const patchToggle = async (
    key: keyof Pick<Config["security"], "blockDownloads" | "blockAds">,
    val: boolean,
  ) => {
    const next = { ...cfg, [key]: val }
    setCfg(next)
    await storage.local.update("config", { security: { [key]: val } })
  }

  const patchMode = async (mode: SuspiciousLinkMode) => {
    const next = { ...cfg, blockSuspiciousLinks: mode }
    setCfg(next)
    await storage.local.update("config", {
      security: { blockSuspiciousLinks: mode },
    })
  }

  // Normalise a free-text line into a bare hostname.
  // Handles entries like "https://google.com/search?q=foo" → "google.com".
  // Entries that are already bare hostnames pass through unchanged.
  const normaliseEntry = (raw: string): string => {
    const s = raw.trim()
    if (!s) return ""
    try {
      // Prepend a protocol if missing so URL() can parse it.
      const withProto = s.includes("://") ? s : `https://${s}`
      return new URL(withProto).hostname.toLowerCase()
    } catch {
      // Not parseable — return as-is (validator in service-worker will just not match it).
      return s.toLowerCase()
    }
  }

  const parseList = (text: string) =>
    text.split("\n").map(normaliseEntry).filter(Boolean)

  const saveListFields = async () => {
    const whitelist = parseList(wl)
    const blacklist = parseList(bl)
    // Normalise the textarea values so the user sees cleaned-up entries.
    setWl(whitelist.join("\n"))
    setBl(blacklist.join("\n"))
    await storage.local.update("config", { security: { whitelist, blacklist } })
    showToast("Site lists saved")
  }

  // Detect if user typed a full URL so we can show a normalisation hint.
  const hasFullUrl = (text: string) =>
    text.split("\n").some((l) => l.trim().includes("://"))

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <SettingRow
        label="Block downloads"
        hint="Cancel any file download automatically"
      >
        <Toggle
          checked={cfg.blockDownloads}
          onChange={(v) => patchToggle("blockDownloads", v)}
          label="Block downloads"
        />
      </SettingRow>

      <SettingRow
        label="Block ads"
        hint="Hide ads and tracking scripts on all websites"
      >
        <Toggle
          checked={cfg.blockAds}
          onChange={(v) => patchToggle("blockAds", v)}
          label="Block ads"
        />
      </SettingRow>

      <div
        style={{
          padding: "0.75rem 0",
          borderBottom: "1px solid var(--color-surface-edge)",
        }}
      >
        <div
          id="suspicious-protection-label"
          style={{
            fontWeight: 600,
            fontSize: "0.95rem",
            marginBottom: "0.6rem",
            color: "var(--color-text)",
          }}
        >
          Suspicious site protection
        </div>
        <div
          role="radiogroup"
          aria-labelledby="suspicious-protection-label"
          style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}
        >
          {SUSPICIOUS_LINK_MODES.map((mode) => {
            const info = LINK_MODE_LABELS[mode]
            const active = cfg.blockSuspiciousLinks === mode
            return (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => patchMode(mode)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.6rem 0.8rem",
                  borderRadius: 10,
                  cursor: "pointer",
                  border: `1.5px solid ${active ? "var(--color-accent)" : "var(--color-surface-edge)"}`,
                  background: active
                    ? "var(--color-accent-xlight)"
                    : "var(--color-surface)",
                  textAlign: "left" as const,
                  transition: "background 0.15s, border-color 0.15s",
                }}
              >
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    flexShrink: 0,
                    border: `2px solid ${active ? "var(--color-accent)" : "var(--color-surface-edge)"}`,
                    background: active ? "var(--color-accent)" : "transparent",
                  }}
                />
                <span>
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      color: "var(--color-text)",
                      display: "block",
                    }}
                  >
                    {info.title}
                  </span>
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {info.desc}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          paddingTop: "0.75rem",
        }}
      >
        <Field label="Always allow these sites (one per line)">
          <textarea
            value={wl}
            style={textArea}
            placeholder="google.com&#10;youtube.com"
            onChange={(e) => setWl((e.target as HTMLTextAreaElement).value)}
          />
          {hasFullUrl(wl) && (
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
              ℹ️ Full URLs will be trimmed to hostname on save (e.g. https://google.com → google.com)
            </p>
          )}
        </Field>

        <Field label="Always block these sites (one per line)">
          <textarea
            value={bl}
            style={textArea}
            placeholder="example-scam.com"
            onChange={(e) => setBl((e.target as HTMLTextAreaElement).value)}
          />
          {hasFullUrl(bl) && (
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
              ℹ️ Full URLs will be trimmed to hostname on save (e.g. https://example.com/path → example.com)
            </p>
          )}
        </Field>

        <SaveBtn onClick={saveListFields} />
      </div>
    </div>
  )
}

// ── M-04 Saved links tab ──────────────────────────────────────────────────────

function SavedLinksTab() {
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

    // DS-04: Re-sort live when the side panel saves a new page while this tab
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

// ── M-05 Activity log tab ─────────────────────────────────────────────────────

const TYPE_ICON: Record<string, React.ReactNode> = {
  visit: <GlobeIcon size={16} color="var(--color-text-muted)" />,
  search: <MagnifyingGlassIcon size={16} color="var(--color-text-muted)" />,
  save: <BookmarkSimpleIcon size={16} color="var(--color-text-muted)" />,
}
const PAGE_SIZE = 50

function ActivityLogTab({
  showToast,
}: {
  showToast: (msg: string, type?: ToastType) => void
}) {
  const [log, setLog] = useState<ActivityLogEntry[]>([])
  const [search, setSearch] = useState("")
  const [shown, setShown] = useState(PAGE_SIZE)
  const [confirmingClear, setConfirmingClear] = useState(false)

  useEffect(() => {
    storage.local
      .get("activityLog")
      .then((all) => setLog([...all].reverse()))
      .catch(() => {})
  }, [])

  const clearLog = async () => {
    await storage.local.set("activityLog", [])
    setLog([])
    setConfirmingClear(false)
    showToast("Activity log cleared")
  }

  if (log.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardTextIcon size={36} color="var(--color-text-muted)" />}
        text="No pages visited yet. Pages will appear here as browsing happens."
      />
    )
  }

  // MF-05: filter by search term across title + URL.
  const query = search.trim().toLowerCase()
  const filtered = query
    ? log.filter(
        (e) =>
          e.title.toLowerCase().includes(query) ||
          e.url.toLowerCase().includes(query),
      )
    : log
  const visible = filtered.slice(0, shown)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      {/* Search bar */}
      <div style={{ position: "relative", marginBottom: "0.25rem" }}>
        <span
          style={{
            position: "absolute",
            left: "0.65rem",
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
          }}
        >
          <MagnifyingGlassIcon size={14} color="var(--color-text-muted)" />
        </span>
        <input
          type="search"
          placeholder="Search pages…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShown(PAGE_SIZE) }}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "0.5rem 0.75rem 0.5rem 2rem",
            borderRadius: 8,
            border: "1.5px solid var(--color-surface-edge)",
            background: "var(--color-surface)",
            color: "var(--color-text)",
            fontSize: "0.875rem",
            fontFamily: "inherit",
          }}
        />
      </div>

      {/* Retention note + manual clear — entries auto-expire after
          MAX_LOG_AGE_DAYS, but the caregiver can also clear everything now. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
          marginBottom: "0.25rem",
        }}
      >
        <span style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
          Kept for {MAX_LOG_AGE_DAYS} days, then removed automatically.
        </span>
        {confirmingClear ? (
          <span style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => void clearLog()}
              style={{
                padding: "0.3rem 0.6rem",
                borderRadius: 8,
                border: "1.5px solid var(--color-danger)",
                background: "var(--color-danger-light)",
                color: "var(--color-danger)",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Confirm clear
            </button>
            <button
              type="button"
              onClick={() => setConfirmingClear(false)}
              style={{
                padding: "0.3rem 0.6rem",
                borderRadius: 8,
                border: "1.5px solid var(--color-surface-edge)",
                background: "transparent",
                color: "var(--color-text-muted)",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingClear(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              padding: "0.3rem 0.6rem",
              borderRadius: 8,
              border: "1.5px solid var(--color-surface-edge)",
              background: "transparent",
              color: "var(--color-text-muted)",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              flexShrink: 0,
            }}
          >
            <TrashIcon size={13} /> Clear log
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <p style={{ textAlign: "center", color: "var(--color-text-muted)", fontSize: "0.9rem", padding: "1.5rem 0" }}>
          No results for "{search}"
        </p>
      )}

      {visible.map((entry, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.6rem",
            padding: "0.55rem 0.75rem",
            borderRadius: 8,
            background: i % 2 === 0 ? "transparent" : "var(--color-surface)",
          }}
        >
          <span style={{ display: "flex", flexShrink: 0, marginTop: 1 }}>
            {TYPE_ICON[entry.type] ?? (
              <GlobeIcon size={16} color="var(--color-text-muted)" />
            )}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "0.88rem",
                fontWeight: 600,
                color: "var(--color-text)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {entry.title}
            </div>
            <div
              style={{
                fontSize: "0.78rem",
                color: "var(--color-text-muted)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {/* Show just the domain — raw URLs are meaningless to seniors */}
              {(() => { try { return new URL(entry.url).hostname.replace(/^www\./, "") } catch { return entry.url } })()}
            </div>
          </div>
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--color-text-muted)",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            {relativeTime(entry.visitedAt)}
          </span>
        </div>
      ))}

      {shown < filtered.length && (
        <button
          type="button"
          onClick={() => setShown((n) => n + PAGE_SIZE)}
          style={{
            marginTop: "0.5rem",
            padding: "0.5rem",
            borderRadius: 8,
            border: "1.5px solid var(--color-surface-edge)",
            background: "transparent",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
            color: "var(--color-text-muted)",
          }}
        >
          Show {Math.min(PAGE_SIZE, filtered.length - shown)} more (of{" "}
          {filtered.length - shown} remaining)
        </button>
      )}
    </div>
  )
}

// ── M-06 Trial tab ────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<
  string,
  { bg: string; color: string; label: string }
> = {
  trial: {
    bg: "var(--color-success-light)",
    color: "var(--color-success)",
    label: "Free trial active",
  },
  active: {
    bg: "var(--color-success-light)",
    color: "var(--color-success)",
    label: "Subscription active",
  },
  grace: {
    bg: "var(--color-accent-xlight)",
    color: "var(--color-accent)",
    label: "Renewal needed soon",
  },
  expired: {
    bg: "var(--color-danger-light)",
    color: "var(--color-danger)",
    label: "Subscription ended",
  },
  not_found: {
    bg: "var(--color-surface)",
    color: "var(--color-text-muted)",
    label: "Not set up yet",
  },
}

const VALIDATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-license`

function TrialTab() {
  const [sub, setSub] = useState<Subscription | null>(null)
  const [logCount, setLogCount] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  // Load cached data immediately, then fetch fresh info from the server.
  useEffect(() => {
    Promise.all([
      storage.local.get("subscription"),
      storage.local.get("activityLog"),
    ])
      .then(([s, log]) => {
        setSub(s)
        setLogCount(log.length)
        // Fetch live data from Supabase if we have a license key
        if (s?.licenseKey) fetchLive(s)
      })
      .catch(() => {})
  }, [])

  const fetchLive = async (cached: Subscription) => {
    setRefreshing(true)
    try {
      const res = await fetch(VALIDATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey: cached.licenseKey }),
      })
      if (!res.ok) return
      // `email` is no longer returned by validate-license (audit #2); the
      // locally-cached email is kept instead. Typed optional to match.
      const data = await res.json() as {
        status: string
        daysLeft: number | null
        trialEndsAt: string | null
        currentPeriodEndsAt: string | null
        email?: string
      }
      const updated: Subscription = {
        ...cached,
        status: data.status as Subscription["status"],
        daysLeft: data.daysLeft,
        trialEndsAt: data.trialEndsAt,
        lastValidatedAt: new Date().toISOString(),
        ...(data.email && { email: data.email }),
      }
      await storage.local.set("subscription", updated)
      setSub(updated)
    } catch {
      // Server unreachable — cached data is fine
    } finally {
      setRefreshing(false)
    }
  }

  if (!sub) {
    return (
      <EmptyState
        icon={<HourglassIcon size={36} color="var(--color-text-muted)" />}
        text="No account found. Please reinstall to set up a new account."
      />
    )
  }

  // daysLeft comes from the server after the first 24h validation.
  // Before that, compute it locally from trialEndsAt so it shows correctly immediately.
  const daysLeft = sub.daysLeft ??
    (sub.trialEndsAt
      ? Math.max(0, Math.ceil((new Date(sub.trialEndsAt).getTime() - Date.now()) / 86_400_000))
      : 0)
  const st = STATUS_STYLE[sub.status] ?? STATUS_STYLE["not_found"]!

  const storeSlug = import.meta.env.VITE_LEMON_SQUEEZY_STORE_ID ?? ""
  const monthlyId = import.meta.env.VITE_LEMON_SQUEEZY_MONTHLY_VARIANT_ID ?? ""
  const yearlyId = import.meta.env.VITE_LEMON_SQUEEZY_YEARLY_VARIANT_ID ?? ""
  const emailParam = sub.email
    ? `&checkout[custom][email]=${encodeURIComponent(sub.email)}`
    : ""
  const monthlyUrl = `https://${storeSlug}.lemonsqueezy.com/buy/${monthlyId}?${emailParam}`
  const yearlyUrl = `https://${storeSlug}.lemonsqueezy.com/buy/${yearlyId}?${emailParam}`

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Status badge + refresh */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <span
          style={{
            padding: "0.3rem 0.9rem",
            borderRadius: 20,
            background: st.bg,
            color: st.color,
            fontSize: "0.875rem",
            fontWeight: 700,
          }}
        >
          {st.label}
        </span>
        {(sub.status === "trial" || sub.status === "grace") && daysLeft !== null && (
          <span style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
            {daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining
          </span>
        )}
        <button
          onClick={() => fetchLive(sub)}
          disabled={refreshing}
          title="Refresh from server"
          style={{
            marginLeft: "auto",
            background: "none",
            border: "none",
            cursor: refreshing ? "default" : "pointer",
            color: "var(--color-text-muted)",
            fontSize: "0.8rem",
            opacity: refreshing ? 0.5 : 1,
            padding: "0.2rem 0.4rem",
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
          }}
        >
          {refreshing ? "Checking…" : "↻ Refresh"}
        </button>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.75rem",
        }}
      >
        {sub.email && <StatCard label="Account" value={sub.email} />}
        <StatCard label="Pages visited" value={String(logCount)} />
        {sub.trialEndsAt && (
          <StatCard
            label="Trial ends"
            value={new Date(sub.trialEndsAt).toLocaleDateString()}
          />
        )}
        {sub.lastValidatedAt && (
          <StatCard
            label="Last checked"
            value={new Date(sub.lastValidatedAt).toLocaleDateString()}
          />
        )}
      </div>

      {/* Subscribe CTA */}
      {monthlyId && (sub.status === "trial" || sub.status === "grace" || sub.status === "expired") && (
        <div
          style={{
            padding: "1.2rem",
            borderRadius: 12,
            background: "var(--color-surface)",
            border: "1.5px solid var(--color-surface-edge)",
            display: "flex",
            flexDirection: "column",
            gap: "0.6rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.25rem" }}>
            <CreditCardIcon size={28} color="var(--color-text-muted)" />
          </div>
          <div style={{ fontWeight: 700, textAlign: "center" as const }}>
            Subscribe to keep using SeniorBrowse
          </div>
          <a
            href={yearlyUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "block",
              padding: "0.75rem",
              background: "var(--color-accent)",
              color: "#fff",
              borderRadius: "var(--radius-md)",
              fontWeight: 700,
              fontSize: "0.95rem",
              textDecoration: "none",
              textAlign: "center" as const,
            }}
          >
            $39.99 / year (best value)
          </a>
          <a
            href={monthlyUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "block",
              padding: "0.65rem",
              background: "transparent",
              color: "var(--color-text-muted)",
              border: "1.5px solid var(--color-surface-edge)",
              borderRadius: "var(--radius-md)",
              fontWeight: 600,
              fontSize: "0.9rem",
              textDecoration: "none",
              textAlign: "center" as const,
            }}
          >
            $4.99 / month
          </a>
          {/* CUX-02: After subscribing, tell the user to hit Refresh so the
              status updates immediately rather than waiting for the next
              background validation cycle. */}
          <p
            style={{
              margin: 0,
              fontSize: "0.78rem",
              color: "var(--color-text-muted)",
              textAlign: "center" as const,
              lineHeight: 1.5,
            }}
          >
            After subscribing, come back here and click{" "}
            <strong style={{ color: "var(--color-text)" }}>↻ Refresh</strong>{" "}
            to activate your account instantly.
          </p>
        </div>
      )}

      {/* Protected by SeniorBrowse — quiet trust mark at the bottom of the
          License tab. Tilted slightly to feel stamped-by-hand. */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          paddingTop: "0.5rem",
          paddingBottom: "0.25rem",
        }}
      >
        <img
          src="/brand/stamp-protected.svg"
          alt="Protected by SeniorBrowse"
          style={{
            height: 64,
            width: "auto",
            transform: "rotate(-3deg)",
            opacity: 0.92,
          }}
        />
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: "0.75rem",
        borderRadius: 10,
        background: "var(--color-surface)",
        border: "1.5px solid var(--color-surface-edge)",
      }}
    >
      <div
        style={{
          fontSize: "0.78rem",
          color: "var(--color-text-muted)",
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontWeight: 700,
          fontSize: "1rem",
          color: "var(--color-text)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={value}
      >
        {value}
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div
      style={{
        textAlign: "center" as const,
        padding: "3rem 1.5rem",
        color: "var(--color-text-muted)",
        background: "var(--color-surface)",
        borderRadius: "var(--radius-md)",
        border: "1.5px solid var(--color-surface-edge)",
      }}
    >
      <div
        style={{
          marginBottom: "0.75rem",
          display: "flex",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.55 }}>{text}</p>
    </div>
  )
}

function Spinner() {
  return (
    <div
      style={{
        textAlign: "center" as const,
        padding: "2.5rem",
        color: "var(--color-text-muted)",
        fontSize: "0.9rem",
      }}
    >
      Loading…
    </div>
  )
}

// ── M-01 Modal shell ──────────────────────────────────────────────────────────

type Tab = "profile" | "security" | "savedLinks" | "activityLog" | "trial"

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
  {
    id: "trial",
    label: "Billing",
    title: "Billing",
    subtitle: "Trial status, subscription, account email.",
    icon: <StarIcon size={14} />,
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
            {activeTab === "trial" && <TrialTab />}
          </div>
        </section>
      </div>
    </div>
  )
}
