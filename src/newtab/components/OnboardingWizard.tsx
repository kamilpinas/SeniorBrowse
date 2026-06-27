// O-01: Caregiver setup wizard — opens automatically on first install.
// Steps: Welcome → Names → Shortcuts → Security → Handover

import { useEffect, useRef, useState } from "react"
import {
  ArrowRightIcon,
  ConfettiIcon,
  HandWavingIcon,
  LockSimpleIcon,
  MapPinIcon,
  NewspaperIcon,
  PaletteIcon,
  PlayIcon,
  PlusIcon,
  RulerIcon,
  UsersIcon,
  XIcon,
} from "@phosphor-icons/react"
import { storage } from "@shared/storage"
import { SHORTCUT_SIZES } from "@shared/constants"
import { hashPin } from "@shared/pin"
import type { ShortcutSize, ThemeColor } from "@shared/types"
import { ThemeColorPicker } from "./ThemeColorPicker"
import { applyTheme } from "../hooks/useTheme"
import { Mark } from "@shared/Mark"

interface Props {
  onComplete: () => void
}

// ── Shared styles ────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "var(--color-bg)",
  border: "1.5px solid var(--color-surface-edge)",
  borderRadius: "var(--radius-lg)",
  width: "100%",
  // Wider card gives multi-item steps (size options, theme swatches, security
  // toggles) room to lay out horizontally instead of stacking — which is what
  // keeps the content inside one height without scrolling.
  maxWidth: 640,
  // Flexible height that uses most of the viewport. All steps fit without
  // scrolling by optimizing spacing. The dots stay pinned at the top and the
  // back/skip row at the bottom; content between them never scrolls.
  height: "calc(100vh - 2.5rem)",
  maxHeight: "95vh",
  padding: "1.5rem 2rem",
  boxShadow: "0 8px 40px rgba(42,38,32,0.18)",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  overflow: "hidden",
}

// Content body that holds the active step's content. Uses flex layout
// to ensure it never scrolls — all steps fit within available space.
const stepScroll: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: "visible",
  display: "flex",
  flexDirection: "column",
  gap: "1.2rem",
  paddingRight: "0.25rem",
}

const heading: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 800,
  color: "var(--color-text)",
  margin: 0,
  lineHeight: 1.25,
}

const body: React.CSSProperties = {
  fontSize: "1rem",
  color: "var(--color-text-muted)",
  margin: 0,
  lineHeight: 1.6,
}

const primaryBtn: React.CSSProperties = {
  padding: "0.75rem 1.6rem",
  background: "var(--color-accent)",
  color: "#fff",
  border: "none",
  borderRadius: "var(--radius-md)",
  fontSize: "1rem",
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.4rem",
  transition:
    "background 0.15s cubic-bezier(.4,0,.2,1), transform 0.15s cubic-bezier(.4,0,.2,1), border-color 0.15s",
}

const inputStyle: React.CSSProperties = {
  padding: "0.6rem 0.85rem",
  borderRadius: 10,
  border: "1.5px solid var(--color-surface-edge)",
  background: "var(--color-surface)",
  fontSize: "0.9rem",
  fontFamily: "inherit",
  color: "var(--color-text)",
  outline: "none",
  width: "100%",
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
          fontSize: "0.9rem",
          color: "var(--color-text)",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  )
}

// ── Progress dots ────────────────────────────────────────────────────────────

function Dots({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          style={{
            width: i === step ? 20 : 8,
            height: 8,
            borderRadius: 4,
            background:
              i === step ? "var(--color-accent)" : "var(--color-surface-edge)",
            transition: "width 0.2s, background 0.2s",
            display: "inline-block",
          }}
        />
      ))}
    </div>
  )
}

// ── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        position: "relative",
        width: 44,
        height: 24,
        borderRadius: 12,
        flexShrink: 0,
        background: checked
          ? "var(--color-accent)"
          : "var(--color-surface-edge)",
        border: "none",
        cursor: "pointer",
        padding: 0,
        transition: "background 0.22s, box-shadow 0.22s",
        boxShadow: checked ? "0 0 0 3px var(--color-accent-light)" : "none",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 22 : 2,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.18s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.22)",
        }}
      />
    </button>
  )
}

// ── Steps ────────────────────────────────────────────────────────────────────

// Step 0: Welcome — explicitly addressed to the caregiver doing the setup
function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <>
      {/* Faceless flat illustration — caregiver behind the senior at a
          laptop. Sets the warm "we're doing this together" tone. */}
      <div style={{ textAlign: "center" as const }}>
        <img
          src="/brand/illustration-family-laptop.svg"
          alt=""
          aria-hidden="true"
          style={{
            width: "100%",
            maxWidth: 200,
            height: "auto",
            display: "block",
            margin: "0 auto",
          }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <h2 style={heading}>Let's set this up together</h2>
        <p style={body}>
          You're the caregiver doing this setup — great! This takes about
          3 minutes and you only need to do it once.
        </p>
        <p style={{ ...body, fontSize: "0.9rem" }}>
          You'll enter a name, choose some favourite websites, and set a PIN so
          only you can change the settings later.
        </p>
      </div>

      {/* Pre-empt Chrome's one-time "keep / change back" prompt for the
          new-tab override. Telling the caregiver to expect it turns a
          scary-looking popup into an expected step. */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "0.65rem",
          padding: "0.85rem 1rem",
          background: "var(--color-accent-xlight)",
          border: "1.5px solid var(--color-accent-light)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <HandWavingIcon
          size={20}
          weight="fill"
          color="var(--color-accent)"
          style={{ flexShrink: 0, marginTop: "0.1rem" }}
          aria-hidden="true"
        />
        <p
          style={{
            ...body,
            fontSize: "0.875rem",
            margin: 0,
            color: "var(--color-text)",
          }}
        >
          Chrome may ask if you want to keep SeniorBrowse as the home page.
          Tap <strong>Keep it</strong> to continue — this is normal.
        </p>
      </div>

      <button
        style={primaryBtn}
        onClick={onNext}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--color-accent-strong)"
          e.currentTarget.style.transform = "scale(1.02)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--color-accent)"
          e.currentTarget.style.transform = "scale(1)"
        }}
      >
        Start setup <ArrowRightIcon size={18} />
      </button>
    </>
  )
}

// Step 1: Names
function StepNames({
  onNext,
}: {
  onNext: (senior: string, caregiver: string) => void
}) {
  const [senior, setSenior] = useState("")
  const [caregiver, setCaregiver] = useState("")

  return (
    <>
      <h2 style={heading}>Who are you setting this up for?</h2>
      <p style={body}>
        These names are used in greetings and messages throughout the app.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <Field label="Senior's name (the person who will use this)">
          <input
            type="text"
            value={senior}
            placeholder="e.g. Halina"
            style={inputStyle}
            onChange={(e) => setSenior((e.target as HTMLInputElement).value)}
          />
        </Field>
        <Field label="Your name (the caregiver)">
          <input
            type="text"
            value={caregiver}
            placeholder="e.g. Magda"
            style={inputStyle}
            onChange={(e) => setCaregiver((e.target as HTMLInputElement).value)}
          />
        </Field>
      </div>
      <button
        style={primaryBtn}
        onClick={() => onNext(senior.trim(), caregiver.trim())}
      >
        Next <ArrowRightIcon size={18} />
      </button>
    </>
  )
}

// Step 2: Shortcuts
interface PendingShortcut {
  url: string
  label: string
}

interface SuggestionItem extends PendingShortcut {
  icon: React.ReactNode
}

function StepShortcuts({
  onNext,
}: {
  onNext: (shortcuts: PendingShortcut[]) => void
}) {
  const [url, setUrl] = useState("")
  const [label, setLabel] = useState("")
  const [list, setList] = useState<PendingShortcut[]>([])
  const [err, setErr] = useState("")

  const add = () => {
    setErr("")
    let full = url.trim()
    if (!full) {
      setErr("Please enter a website address.")
      return
    }
    if (!/^https?:\/\//i.test(full)) full = `https://${full}`
    let hostname = ""
    try {
      hostname = new URL(full).hostname
    } catch {
      setErr(
        "That doesn't look like a website address. Try something like youtube.com",
      )
      return
    }
    const finalLabel = label.trim() || hostname.replace(/^www\./, "")
    setList((prev) => [...prev, { url: full, label: finalLabel }])
    setUrl("")
    setLabel("")
  }

  const SUGGESTIONS: SuggestionItem[] = [
    {
      url: "https://youtube.com",
      label: "YouTube",
      icon: <PlayIcon size={14} weight="fill" />,
    },
    {
      url: "https://bbc.co.uk/news",
      label: "BBC News",
      icon: <NewspaperIcon size={14} weight="bold" />,
    },
    {
      url: "https://google.com/maps",
      label: "Maps",
      icon: <MapPinIcon size={14} weight="fill" />,
    },
    {
      url: "https://facebook.com",
      label: "Facebook",
      icon: <UsersIcon size={14} weight="bold" />,
    },
  ]

  return (
    <>
      <h2 style={heading}>Add your favourite websites</h2>
      <p style={body}>
        These will appear as big tiles on the home screen. You can always add
        more later.
      </p>

      {/* Quick-add suggestions */}
      <div>
        <p style={{ ...body, fontSize: "0.875rem", marginBottom: "0.5rem" }}>
          Quick add:
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {SUGGESTIONS.filter((s) => !list.some((l) => l.url === s.url)).map(
            (s) => (
              <button
                key={s.url}
                type="button"
                onClick={() =>
                  setList((prev) => [...prev, { url: s.url, label: s.label }])
                }
                style={{
                  padding: "0.3rem 0.75rem",
                  borderRadius: 20,
                  border: "1.5px solid var(--color-surface-edge)",
                  background: "transparent",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  color: "var(--color-text)",
                  transition: "background 0.15s, border-color 0.15s",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--color-surface)"
                  e.currentTarget.style.borderColor =
                    "var(--color-accent-light)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent"
                  e.currentTarget.style.borderColor =
                    "var(--color-surface-edge)"
                }}
              >
                {s.icon} <PlusIcon size={12} weight="bold" /> {s.label}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Custom URL form */}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          type="text"
          value={url}
          placeholder="Website address"
          style={{ ...inputStyle, flex: 2 }}
          onChange={(e) => setUrl((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add()
          }}
        />
        <input
          type="text"
          value={label}
          placeholder="Label (optional)"
          style={{ ...inputStyle, flex: 1 }}
          onChange={(e) => setLabel((e.target as HTMLInputElement).value)}
        />
        <button
          type="button"
          onClick={add}
          style={{
            ...primaryBtn,
            padding: "0.65rem 1rem",
            whiteSpace: "nowrap" as const,
          }}
        >
          <PlusIcon size={16} weight="bold" /> Add
        </button>
      </div>
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

      {/* Added list */}
      {list.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {list.map((s, i) => (
            <span
              key={i}
              style={{
                padding: "0.3rem 0.75rem",
                borderRadius: 20,
                background: "var(--color-accent-xlight)",
                color: "var(--color-accent)",
                fontSize: "0.875rem",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              {s.label}
              <button
                type="button"
                onClick={() =>
                  setList((prev) => prev.filter((_, j) => j !== i))
                }
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "inherit",
                  padding: 0,
                  fontSize: "1rem",
                  lineHeight: 1,
                }}
              >
                <XIcon size={14} weight="bold" />
              </button>
            </span>
          ))}
        </div>
      )}

      <button
        style={primaryBtn}
        onClick={() => onNext(list)}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--color-accent-strong)"
          e.currentTarget.style.transform = "scale(1.02)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--color-accent)"
          e.currentTarget.style.transform = "scale(1)"
        }}
      >
        Next <ArrowRightIcon size={18} />
      </button>
    </>
  )
}

// Step 3: Shortcut size
const SIZE_META: Record<
  ShortcutSize,
  { label: string; px: number; hint: string }
> = {
  small: { label: "Small", px: 72, hint: "Compact — fits more tiles" },
  medium: { label: "Medium", px: 96, hint: "Balanced — good for most" },
  large: { label: "Large", px: 120, hint: "Easier to tap" },
  xl: { label: "X-Large", px: 148, hint: "Very easy to see and tap" },
  xl2: { label: "Biggest", px: 176, hint: "Maximum size" },
}

function StepShortcutSize({
  onNext,
}: {
  onNext: (size: ShortcutSize) => void
}) {
  const [selected, setSelected] = useState<ShortcutSize>("medium")

  return (
    <>
      <div
        style={{ textAlign: "center" as const, color: "var(--color-accent)" }}
      >
        <RulerIcon size={48} weight="fill" />
      </div>
      <div>
        <h2 style={heading}>How big should the tiles be?</h2>
        <p style={{ ...body, marginTop: "0.5rem" }}>
          Choose the size that works best for the senior's eyesight and hands.
          You can change this at any time in settings.
        </p>
      </div>

      {/* Two-column grid — keeps the 5 options compact instead of a tall
          5-row stack so the step fits the card without scrolling. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: "0.5rem",
        }}
      >
        {SHORTCUT_SIZES.map((size) => {
          const meta = SIZE_META[size]
          const isSelected = selected === size
          return (
            <button
              key={size}
              type="button"
              onClick={() => setSelected(size)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-md)",
                border: `2px solid ${isSelected ? "var(--color-accent)" : "var(--color-surface-edge)"}`,
                background: isSelected
                  ? "var(--color-accent-xlight)"
                  : "var(--color-surface)",
                cursor: "pointer",
                textAlign: "left" as const,
                transition: "border-color 0.15s, background 0.15s",
              }}
            >
              {/* Tile preview */}
              <div
                style={{
                  width: meta.px * 0.5,
                  height: meta.px * 0.5,
                  borderRadius: 8,
                  background: isSelected
                    ? "var(--color-accent)"
                    : "var(--color-surface-edge)",
                  flexShrink: 0,
                  transition: "background 0.15s, width 0.15s, height 0.15s",
                }}
              />
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    color: "var(--color-text)",
                  }}
                >
                  {meta.label}
                </div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {meta.hint}
                </div>
              </div>
              {isSelected && (
                <span
                  style={{
                    marginLeft: "auto",
                    color: "var(--color-accent)",
                    fontWeight: 800,
                    fontSize: "1.1rem",
                  }}
                >
                  ✓
                </span>
              )}
            </button>
          )
        })}
      </div>

      <button
        style={primaryBtn}
        onClick={() => onNext(selected)}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--color-accent-strong)"
          e.currentTarget.style.transform = "scale(1.02)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--color-accent)"
          e.currentTarget.style.transform = "scale(1)"
        }}
      >
        Next <ArrowRightIcon size={18} />
      </button>
    </>
  )
}

// Step 4b: Theme colour — pick the accent palette.
// Live-preview: applies the chosen palette to the wizard background while
// the caregiver browses options. Persists on Next.
function StepTheme({
  initial,
  onNext,
}: {
  initial: ThemeColor
  onNext: (color: ThemeColor) => void
}) {
  const [color, setColor] = useState<ThemeColor>(initial)

  // Live preview as the caregiver clicks swatches.
  const previewColor = (next: ThemeColor) => {
    setColor(next)
    // Use the current document theme (light/dark) so we don't switch brightness.
    const isDark = document.documentElement.classList.contains("dark")
    applyTheme(isDark ? "dark" : "light", next)
  }

  return (
    <>
      <div
        style={{ textAlign: "center" as const, color: "var(--color-accent)" }}
      >
        <PaletteIcon size={48} weight="fill" />
      </div>
      <div>
        <h2 id="wizard-theme-title" style={heading}>
          Pick a colour
        </h2>
        <p style={{ ...body, marginTop: "0.5rem" }}>
          Choose the accent colour for buttons, links and highlights. You can
          change it any time in Settings.
        </p>
      </div>

      <ThemeColorPicker
        value={color}
        onChange={previewColor}
        labelledBy="wizard-theme-title"
      />

      <button
        style={primaryBtn}
        onClick={() => onNext(color)}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--color-accent-strong)"
          e.currentTarget.style.transform = "scale(1.02)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--color-accent)"
          e.currentTarget.style.transform = "scale(1)"
        }}
      >
        Next <ArrowRightIcon size={18} />
      </button>
    </>
  )
}

// Step 4: Security
interface SecurityDraft {
  blockDownloads: boolean
  blockAds: boolean
  blockKnownMalware: boolean
}

function StepSecurity({ onNext }: { onNext: (s: SecurityDraft) => void }) {
  const [settings, setSettings] = useState<SecurityDraft>({
    blockDownloads: true,
    blockAds: true,
    blockKnownMalware: true,
  })

  const patch = (key: keyof SecurityDraft, val: SecurityDraft[typeof key]) =>
    setSettings((prev) => ({ ...prev, [key]: val }))

  return (
    <>
      {/* Faceless "blocked safely" illustration — a senior reading peacefully
          while the shield silently intercepts a scam in the background. */}
      <div style={{ textAlign: "center" as const }}>
        <img
          src="/brand/illustration-blocked-safely.svg"
          alt=""
          aria-hidden="true"
          style={{
            width: "100%",
            maxWidth: 170,
            height: "auto",
            display: "block",
            margin: "0 auto",
          }}
        />
      </div>
      <h2 style={heading}>Keep browsing safe</h2>
      <p style={body}>
        These settings protect the senior while they browse. You can change them
        any time.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        {[
          {
            key: "blockDownloads" as const,
            label: "Block file downloads",
            hint: "Prevent accidental downloads",
          },
          {
            key: "blockAds" as const,
            label: "Block adverts",
            hint: "Hide ads on all websites",
          },
          {
            key: "blockKnownMalware" as const,
            label: "Block known malicious sites",
            hint: "Stop known malware and phishing domains automatically",
          },
        ].map(({ key, label, hint }) => (
          <div
            key={key}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.75rem 1rem",
              background: "var(--color-surface)",
              border: "1.5px solid var(--color-surface-edge)",
              borderRadius: 12,
              gap: "1rem",
            }}
          >
            <div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: "1rem",
                  color: "var(--color-text)",
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontSize: "0.875rem",
                  color: "var(--color-text-muted)",
                }}
              >
                {hint}
              </div>
            </div>
            <Toggle
              checked={settings[key] as boolean}
              onChange={(v) => patch(key, v)}
            />
          </div>
        ))}
      </div>

      <button style={primaryBtn} onClick={() => onNext(settings)}>
        Next <ArrowRightIcon size={18} />
      </button>
    </>
  )
}

// Step: PIN setup — required, not skippable. This is what gates the
// caregiver/admin settings, so it cannot fall back to a known default
// (see audit finding: the old default "1234" was hardcoded and documented
// in the UI, making it a trivial bypass for anyone with device access).
const PIN_NUMPAD_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["⌫", "0"],
] as const

function StepPin({
  onNext,
}: {
  onNext: (pinHash: string, pinSalt: string) => void
}) {
  const [phase, setPhase] = useState<"enter" | "confirm">("enter")
  const [digits, setDigits] = useState<string[]>([])
  const [error, setError] = useState("")
  const [shake, setShake] = useState(false)
  const [saving, setSaving] = useState(false)
  const firstPinRef = useRef("")

  const press = (key: string) => {
    if (shake || saving) return
    if (key === "⌫") {
      setDigits((p) => p.slice(0, -1))
      setError("")
      return
    }
    setDigits((p) => (p.length < 4 ? [...p, key] : p))
  }

  useEffect(() => {
    if (digits.length !== 4 || shake) return

    if (phase === "enter") {
      firstPinRef.current = digits.join("")
      setTimeout(() => {
        setDigits([])
        setPhase("confirm")
      }, 150)
      return
    }

    // phase === "confirm"
    const entered = digits.join("")
    if (entered !== firstPinRef.current) {
      setShake(true)
      setError("PINs don't match — try again")
      setTimeout(() => {
        setShake(false)
        setError("")
        setDigits([])
        firstPinRef.current = ""
        setPhase("enter")
      }, 900)
      return
    }

    setSaving(true)
    void hashPin(entered).then(({ pinHash, pinSalt }) => {
      onNext(pinHash, pinSalt)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits.length])

  return (
    <>
      <div
        style={{ textAlign: "center" as const, color: "var(--color-accent)" }}
      >
        <LockSimpleIcon size={48} weight="fill" />
      </div>
      <div>
        <h2 style={heading}>
          {phase === "enter" ? "Choose your PIN" : "Confirm your PIN"}
        </h2>
        <p style={{ ...body, marginTop: "0.5rem" }}>
          {phase === "enter"
            ? "Pick a 4-digit PIN only you know. You'll use it to open settings later — the senior never sees it."
            : "Enter the same 4 digits again to confirm."}
        </p>
      </div>

      <div
        style={{ display: "flex", gap: "0.85rem", justifyContent: "center" }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background:
                digits.length > i
                  ? error
                    ? "var(--color-accent)"
                    : "var(--color-text)"
                  : "transparent",
              border: `2.5px solid ${
                error
                  ? "var(--color-accent)"
                  : digits.length > i
                    ? "var(--color-text)"
                    : "var(--color-surface-edge)"
              }`,
              transition: "background 0.15s ease, border-color 0.15s ease",
            }}
          />
        ))}
      </div>

      <div style={{ minHeight: "1.1rem", textAlign: "center" as const }}>
        {error && (
          <p
            style={{
              margin: 0,
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "var(--color-accent)",
            }}
          >
            {error}
          </p>
        )}
      </div>

      <div
        style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
      >
        {PIN_NUMPAD_ROWS.map((row, ri) => (
          <div
            key={ri}
            style={{
              display: "flex",
              gap: "0.5rem",
              justifyContent: row.length < 3 ? "center" : "stretch",
            }}
          >
            {row.map((key) => (
              <button
                key={key}
                type="button"
                disabled={shake || saving}
                onClick={() => press(key)}
                style={{
                  flex: row.length === 3 ? 1 : undefined,
                  width: row.length < 3 ? 72 : undefined,
                  height: 64,
                  fontSize: key === "⌫" ? "1.1rem" : "1.5rem",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  background: "var(--color-surface)",
                  border: "1.5px solid var(--color-surface-edge)",
                  borderRadius: 14,
                  cursor: shake || saving ? "default" : "pointer",
                  color: "var(--color-text)",
                  userSelect: "none" as const,
                }}
              >
                {key}
              </button>
            ))}
          </div>
        ))}
      </div>
    </>
  )
}

// Step 4: Handover
function StepHandover({
  seniorName,
  onStartTour,
}: {
  seniorName: string
  onStartTour: () => void
}) {
  const name = seniorName || "the senior"
  return (
    <>
      <div
        style={{ textAlign: "center" as const, color: "var(--color-accent)" }}
      >
        <ConfettiIcon size={48} weight="fill" />
      </div>
      <div>
        <h2 style={heading}>
          All <Mark>set!</Mark>
        </h2>
        <p style={{ ...body, marginTop: "0.5rem" }}>
          SeniorBrowse is ready for <strong>{name}</strong>. Now ask them to sit
          down with you for a quick walkthrough — it only takes two minutes.
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <button
          style={primaryBtn}
          onClick={onStartTour}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--color-accent-strong)"
            e.currentTarget.style.transform = "scale(1.02)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--color-accent)"
            e.currentTarget.style.transform = "scale(1)"
          }}
        >
          Start the quick tour for {name} <ArrowRightIcon size={18} />
        </button>
      </div>
    </>
  )
}

// ── Wizard container ─────────────────────────────────────────────────────────

const TOTAL_STEPS = 8

export function OnboardingWizard({ onComplete }: Props) {
  const [step, setStep] = useState(0)
  const [seniorName, setSeniorName] = useState("")
  const [themeColor, setThemeColor] = useState<ThemeColor>("red")

  const markDone = () =>
    storage.local.update("config", { onboardingDone: true }).catch(() => {})

  // step 1 → 2: names saved
  const handleStep1 = async (senior: string, caregiver: string) => {
    setSeniorName(senior)
    await storage.local.update("config", {
      seniorName: senior,
      caregiverName: caregiver,
    })
    setStep(2)
  }

  // step 2 → 3: shortcuts saved
  const handleStep2 = async (shortcuts: PendingShortcut[]) => {
    if (shortcuts.length > 0) {
      const existing = await storage.local.get("shortcuts")
      const startPos = existing.length
      const newShortcuts = shortcuts.map((s, i) => ({
        id: crypto.randomUUID(),
        label: s.label,
        url: s.url,
        iconUrl: `https://www.google.com/s2/favicons?domain=${new URL(s.url).hostname}&sz=64`,
        position: startPos + i,
        size: "medium" as const,
      }))
      await storage.local.set("shortcuts", [...existing, ...newShortcuts])
    }
    setStep(3)
  }

  // step 3 → 4: shortcut size saved
  const handleStep3 = async (size: ShortcutSize) => {
    await storage.local.update("config", { shortcutSize: size })
    setStep(4)
  }

  // step 4 → 5: theme colour saved (live-applied during preview)
  const handleStep4 = async (color: ThemeColor) => {
    setThemeColor(color)
    await storage.local.update("config", { themeColor: color })
    setStep(5)
  }

  // step 5 → 6: security saved
  const handleStep5 = async (sec: {
    blockDownloads: boolean
    blockAds: boolean
    blockKnownMalware: boolean
  }) => {
    await storage.local.update("config", { security: sec })
    setStep(6)
  }

  // step 6 → 7: PIN set
  const handleStep6 = async (pinHash: string, pinSalt: string) => {
    await storage.local.update("config", { pinHash, pinSalt })
    setStep(7)
  }

  const handleStartTour = async () => {
    await markDone()
    onComplete()
    // Senior tour is triggered by the panel wizard when it finishes —
    // no need to start it here (that would run both wizards simultaneously).
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10100,
        background: "var(--color-bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        overflowY: "auto",
      }}
    >
      <div style={card}>
        <Dots step={step} total={TOTAL_STEPS} />

        <div style={stepScroll}>
          {step === 0 && <StepWelcome onNext={() => setStep(1)} />}
          {step === 1 && <StepNames onNext={handleStep1} />}
          {step === 2 && <StepShortcuts onNext={handleStep2} />}
          {step === 3 && <StepShortcutSize onNext={handleStep3} />}
          {step === 4 && <StepTheme initial={themeColor} onNext={handleStep4} />}
          {step === 5 && <StepSecurity onNext={handleStep5} />}
          {step === 6 && <StepPin onNext={handleStep6} />}
          {step === 7 && (
            <StepHandover seniorName={seniorName} onStartTour={handleStartTour} />
          )}
        </div>

        {/* Back / skip row for optional steps */}
        {step >= 1 && step <= 7 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {/* ← Back: go to previous step */}
            <button
              onClick={() => setStep((s) => s - 1)}
              style={{
                background: "none",
                border: "none",
                color: "var(--color-text-subtle)",
                fontSize: "0.85rem",
                cursor: "pointer",
                padding: "0.25rem 0",
                textDecoration: "underline",
                textDecorationStyle: "dotted" as const,
                textUnderlineOffset: "3px",
              }}
            >
              ← Back
            </button>

            {/* Skip this step → only on non-final optional steps */}
            {step >= 1 && step <= 5 && (
              <button
                onClick={() => setStep((s) => s + 1)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-text-subtle)",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  padding: "0.25rem 0",
                  textDecoration: "underline",
                  textDecorationStyle: "dotted" as const,
                  textUnderlineOffset: "3px",
                }}
              >
                Skip this step →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
