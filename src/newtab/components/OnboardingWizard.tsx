// O-01: Caregiver setup wizard — opens automatically on first install.
// Steps: Welcome → Names → Shortcuts → Security → Handover

import { useState } from "react"
import {
  ArrowRightIcon,
  ConfettiIcon,
  EnvelopeIcon,
  HandIcon,
  MapPinIcon,
  NewspaperIcon,
  PlayIcon,
  PlusIcon,
  RulerIcon,
  UsersIcon,
  XIcon,
} from "@phosphor-icons/react"
import { storage } from "@shared/storage"
import { SHORTCUT_SIZES } from "@shared/constants"
import type {
  ShortcutSize,
  Subscription,
  SuspiciousLinkMode,
} from "@shared/types"

const REGISTER_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register-license`

interface Props {
  onComplete: () => void
}

// ── Shared styles ────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "var(--color-bg)",
  border: "1.5px solid var(--color-surface-edge)",
  borderRadius: "var(--radius-lg)",
  width: "100%",
  maxWidth: 520,
  padding: "2.5rem 2.25rem",
  boxShadow: "0 8px 40px rgba(42,38,32,0.18)",
  display: "flex",
  flexDirection: "column",
  gap: "1.5rem",
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

const ghostBtnStyle: React.CSSProperties = {
  padding: "0.75rem 1.4rem",
  background: "transparent",
  color: "var(--color-text-muted)",
  border: "1.5px solid var(--color-surface-edge)",
  borderRadius: "var(--radius-md)",
  fontSize: "0.9rem",
  fontWeight: 600,
  cursor: "pointer",
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
        transition: "background 0.2s",
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

// Step 0: Welcome
function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <>
      <div
        style={{ textAlign: "center" as const, color: "var(--color-accent)" }}
      >
        <HandIcon size={48} weight="fill" />
      </div>
      <div>
        <h2 style={heading}>Welcome to SeniorBrowse!</h2>
        <p style={{ ...body, marginTop: "0.5rem" }}>
          Let's get everything set up in a few easy steps. It only takes about
          two minutes.
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
        Get started <ArrowRightIcon size={18} />
      </button>
    </>
  )
}

// Step 1: Email — registers / recovers the license on the server
function StepEmail({ onNext }: { onNext: (email: string) => void }) {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  // Only shown after a network/server error — not after deliberate rejections
  // (device reuse, disposable email). Lets caregivers without internet finish setup.
  const [showOfflineSkip, setShowOfflineSkip] = useState(false)

  const handleSubmit = async () => {
    setError("")
    setShowOfflineSkip(false)
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !trimmed.includes("@")) {
      setError("Please enter a valid email address.")
      return
    }
    setLoading(true)
    try {
      const installId = await storage.local.get("installId")
      const res = await fetch(REGISTER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, installId }),
      })
      const data = (await res.json()) as {
        licenseKey?: string
        status?: string
        trialEndsAt?: string
        error?: string
        reason?: string
      }
      if (!res.ok) {
        if (res.status === 403) {
          // Deliberate rejection — device or email reuse. No offline skip.
          setError(
            data.reason === "device"
              ? "This browser has already used its free trial. Please subscribe at seniorbrowse.app to continue."
              : "This email's free trial has already been used. Please subscribe at seniorbrowse.app to continue.",
          )
        } else {
          setError(data.error ?? "Something went wrong. Please try again.")
          setShowOfflineSkip(true)
        }
        return
      }
      const trialEndsAt = data.trialEndsAt ?? null
      const daysLeft = trialEndsAt
        ? Math.max(
            0,
            Math.ceil(
              (new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000,
            ),
          )
        : null
      const sub: Subscription = {
        status: (data.status ?? "trial") as Subscription["status"],
        licenseKey: data.licenseKey!,
        email: trimmed,
        trialEndsAt,
        lastValidatedAt: null,
        daysLeft,
      }
      await storage.local.set("subscription", sub)
      onNext(trimmed)
    } catch {
      // Network error — show error and reveal the offline skip option.
      setError("Network error. Please check your connection and try again.")
      setShowOfflineSkip(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div
        style={{ textAlign: "center" as const, color: "var(--color-accent)" }}
      >
        <EnvelopeIcon size={48} weight="fill" />
      </div>
      <div>
        <h2 style={heading}>Start your free 7-day trial</h2>
        <p style={{ ...body, marginTop: "0.5rem" }}>
          Enter your email to create your account. No credit card needed now.
        </p>
      </div>
      <Field label="Your email address">
        <input
          type="email"
          value={email}
          placeholder="e.g. magda@example.com"
          style={inputStyle}
          autoFocus
          onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleSubmit()
          }}
        />
      </Field>
      {error && (
        <p style={{ margin: 0, color: "#c0392b", fontSize: "0.875rem" }}>
          {error}
        </p>
      )}
      <button
        style={{ ...primaryBtn, opacity: loading ? 0.7 : 1 }}
        onClick={() => void handleSubmit()}
        disabled={loading}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.background = "var(--color-accent-strong)"
            e.currentTarget.style.transform = "scale(1.02)"
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--color-accent)"
          e.currentTarget.style.transform = "scale(1)"
        }}
      >
        {loading ? (
          "Checking…"
        ) : (
          <>
            Continue <ArrowRightIcon size={18} />
          </>
        )}
      </button>
      {/* Offline escape hatch — only revealed after a network/server error.
          Not shown for deliberate rejections (device reuse, disposable email). */}
      {showOfflineSkip && (
        <button
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-subtle)",
            fontSize: "0.82rem",
            cursor: "pointer",
            padding: "0.25rem 0",
            textAlign: "center" as const,
            textDecoration: "underline",
            textDecorationStyle: "dotted" as const,
            textUnderlineOffset: "3px",
          }}
          onClick={() => onNext("")}
        >
          No internet right now — I'll register my email from Settings later
        </button>
      )}
    </>
  )
}

// Step 2: Names
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

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
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

// Step 4: Security
interface SecurityDraft {
  blockDownloads: boolean
  blockAds: boolean
  blockSuspiciousLinks: SuspiciousLinkMode
}

function StepSecurity({ onNext }: { onNext: (s: SecurityDraft) => void }) {
  const [settings, setSettings] = useState<SecurityDraft>({
    blockDownloads: true,
    blockAds: true,
    blockSuspiciousLinks: "warn",
  })

  const patch = (key: keyof SecurityDraft, val: SecurityDraft[typeof key]) =>
    setSettings((prev) => ({ ...prev, [key]: val }))

  return (
    <>
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

        <div
          style={{
            padding: "0.75rem 1rem",
            background: "var(--color-surface)",
            border: "1.5px solid var(--color-surface-edge)",
            borderRadius: 12,
          }}
        >
          <div
            style={{
              fontWeight: 600,
              fontSize: "1rem",
              color: "var(--color-text)",
              marginBottom: "0.5rem",
            }}
          >
            Dangerous website warnings
          </div>
          {(["warn", "block", "off"] as SuspiciousLinkMode[]).map((mode) => (
            <label
              key={mode}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                padding: "0.3rem 0",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              <input
                type="radio"
                name="sbMode"
                value={mode}
                checked={settings.blockSuspiciousLinks === mode}
                onChange={() => patch("blockSuspiciousLinks", mode)}
              />
              <span style={{ color: "var(--color-text)" }}>
                {mode === "warn"
                  ? "Show a warning (recommended)"
                  : mode === "block"
                    ? "Block automatically"
                    : "Off"}
              </span>
            </label>
          ))}
        </div>
      </div>

      <button style={primaryBtn} onClick={() => onNext(settings)}>
        Next <ArrowRightIcon size={18} />
      </button>
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
        <h2 style={heading}>All set!</h2>
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

const TOTAL_STEPS = 7

export function OnboardingWizard({ onComplete }: Props) {
  const [step, setStep] = useState(0)
  const [seniorName, setSeniorName] = useState("")

  const markDone = () =>
    storage.local.update("config", { onboardingDone: true }).catch(() => {})


  // step 1 → 2: email registered
  const handleStep1 = (_email: string) => setStep(2)

  // step 2 → 3: names saved
  const handleStep2 = async (senior: string, caregiver: string) => {
    setSeniorName(senior)
    await storage.local.update("config", {
      seniorName: senior,
      caregiverName: caregiver,
    })
    setStep(3)
  }

  // step 3 → 4: shortcuts saved
  const handleStep3 = async (shortcuts: PendingShortcut[]) => {
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
    setStep(4)
  }

  // step 4 → 5: shortcut size saved
  const handleStep4 = async (size: ShortcutSize) => {
    await storage.local.update("config", { shortcutSize: size })
    setStep(5)
  }

  // step 5 → 6: security saved
  const handleStep5 = async (sec: {
    blockDownloads: boolean
    blockAds: boolean
    blockSuspiciousLinks: SuspiciousLinkMode
  }) => {
    await storage.local.update("config", { security: sec })
    setStep(6)
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
        padding: "2rem",
        overflowY: "auto",
      }}
    >
      <div style={card}>
        <Dots step={step} total={TOTAL_STEPS} />

        {step === 0 && <StepWelcome onNext={() => setStep(1)} />}
        {step === 1 && <StepEmail onNext={handleStep1} />}
        {step === 2 && <StepNames onNext={handleStep2} />}
        {step === 3 && <StepShortcuts onNext={handleStep3} />}
        {step === 4 && <StepShortcutSize onNext={handleStep4} />}
        {step === 5 && <StepSecurity onNext={handleStep5} />}
        {step === 6 && (
          <StepHandover seniorName={seniorName} onStartTour={handleStartTour} />
        )}

        {/* Back / skip row for optional steps */}
        {step >= 2 && step <= 6 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.25rem" }}>
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
            {step >= 2 && step <= 5 && (
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
