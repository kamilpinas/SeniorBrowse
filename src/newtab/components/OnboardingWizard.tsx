// O-01: Caregiver setup wizard — opens automatically on first install.
// Steps: Welcome → Names → Shortcuts → Security → Handover

import { useState } from "react"
import { storage } from "@shared/storage"
import type { SuspiciousLinkMode } from "@shared/types"

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
  fontSize: "1.5rem",
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
  fontSize: "1.5rem",
  fontWeight: 700,
  cursor: "pointer",
}

const ghostBtnStyle: React.CSSProperties = {
  padding: "0.75rem 1.2rem",
  background: "transparent",
  color: "var(--color-text-muted)",
  border: "1.5px solid var(--color-surface-edge)",
  borderRadius: "var(--radius-md)",
  fontSize: "0.9rem",
  fontWeight: 600,
  cursor: "pointer",
}

const inputStyle: React.CSSProperties = {
  padding: "0.65rem 0.85rem",
  borderRadius: 10,
  border: "1.5px solid var(--color-surface-edge)",
  background: "var(--color-surface)",
  fontSize: "1.5rem",
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
function StepWelcome({
  onNext,
  onSkip,
}: {
  onNext: () => void
  onSkip: () => void
}) {
  return (
    <>
      <div style={{ textAlign: "center" as const, fontSize: "3rem" }}>👋</div>
      <div>
        <h2 style={heading}>Welcome to SeniorWeb!</h2>
        <p style={{ ...body, marginTop: "0.5rem" }}>
          Let's get everything set up in a few easy steps. It only takes about
          two minutes.
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <button style={primaryBtn} onClick={onNext}>
          Get started →
        </button>
        <button style={ghostBtnStyle} onClick={onSkip}>
          Skip setup (I'll configure it later)
        </button>
      </div>
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
        Next →
      </button>
    </>
  )
}

// Step 2: Shortcuts
interface PendingShortcut {
  url: string
  label: string
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
      setErr("Invalid address.")
      return
    }
    const finalLabel = label.trim() || hostname.replace(/^www\./, "")
    setList((prev) => [...prev, { url: full, label: finalLabel }])
    setUrl("")
    setLabel("")
  }

  const SUGGESTIONS: PendingShortcut[] = [
    { url: "https://youtube.com", label: "YouTube" },
    { url: "https://bbc.co.uk/news", label: "BBC News" },
    { url: "https://google.com/maps", label: "Maps" },
    { url: "https://facebook.com", label: "Facebook" },
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
                onClick={() => setList((prev) => [...prev, s])}
                style={{
                  padding: "0.3rem 0.75rem",
                  borderRadius: 20,
                  border: "1.5px solid var(--color-surface-edge)",
                  background: "transparent",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  color: "var(--color-text)",
                }}
              >
                + {s.label}
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
          + Add
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
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button style={primaryBtn} onClick={() => onNext(list)}>
          Next →
        </button>
        <button style={ghostBtnStyle} onClick={() => onNext([])}>
          Skip for now
        </button>
      </div>
    </>
  )
}

// Step 3: Security
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
        Next →
      </button>
    </>
  )
}

// Step 4: Handover
function StepHandover({
  seniorName,
  onDone,
  onStartTour,
}: {
  seniorName: string
  onDone: () => void
  onStartTour: () => void
}) {
  const name = seniorName || "the senior"
  return (
    <>
      <div style={{ textAlign: "center" as const, fontSize: "3rem" }}>🎉</div>
      <div>
        <h2 style={heading}>All set!</h2>
        <p style={{ ...body, marginTop: "0.5rem" }}>
          SeniorWeb is ready for <strong>{name}</strong>. Now ask them to sit
          down with you for a quick walkthrough — it only takes two minutes.
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <button style={primaryBtn} onClick={onStartTour}>
          Start the quick tour for {name} →
        </button>
        <button style={ghostBtnStyle} onClick={onDone}>
          Skip the tour — we're done
        </button>
      </div>
    </>
  )
}

// ── Wizard container ─────────────────────────────────────────────────────────

const TOTAL_STEPS = 5

export function OnboardingWizard({ onComplete }: Props) {
  const [step, setStep] = useState(0)
  const [seniorName, setSeniorName] = useState("")

  const markDone = () =>
    storage.local.update("config", { onboardingDone: true }).catch(() => {})

  const handleSkip = async () => {
    await markDone()
    onComplete()
  }

  const handleStep1 = async (senior: string, caregiver: string) => {
    setSeniorName(senior)
    await storage.local.update("config", {
      seniorName: senior,
      caregiverName: caregiver,
    })
    setStep(2)
  }

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

  const handleStep3 = async (sec: {
    blockDownloads: boolean
    blockAds: boolean
    blockSuspiciousLinks: SuspiciousLinkMode
  }) => {
    await storage.local.update("config", { security: sec })
    setStep(4)
  }

  const handleDone = async () => {
    await markDone()
    onComplete()
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
      }}
    >
      <div style={card}>
        <Dots step={step} total={TOTAL_STEPS} />

        {step === 0 && (
          <StepWelcome onNext={() => setStep(1)} onSkip={handleSkip} />
        )}
        {step === 1 && <StepNames onNext={handleStep1} />}
        {step === 2 && <StepShortcuts onNext={handleStep2} />}
        {step === 3 && <StepSecurity onNext={handleStep3} />}
        {step === 4 && (
          <StepHandover
            seniorName={seniorName}
            onDone={handleDone}
            onStartTour={handleStartTour}
          />
        )}
      </div>
    </div>
  )
}
