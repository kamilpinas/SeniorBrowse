// Caregiver setup wizard — opens automatically on first install.
// Steps: Welcome → Names → Shortcuts → Security → Handover

import { useState } from "react"
import { storage } from "@shared/storage"
import type { ThemeColor } from "@shared/types"
import { StepWelcome } from "./onboarding/StepWelcome"
import { StepNames } from "./onboarding/StepNames"
import { StepShortcuts, type PendingShortcut } from "./onboarding/StepShortcuts"
import { StepShortcutSize } from "./onboarding/StepShortcutSize"
import { StepTheme } from "./onboarding/StepTheme"
import { StepSecurity, type SecurityDraft } from "./onboarding/StepSecurity"
import { StepPin } from "./onboarding/StepPin"
import { StepHandover } from "./onboarding/StepHandover"
import type { ShortcutSize } from "@shared/types"

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
  const handleStep5 = async (sec: SecurityDraft) => {
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
