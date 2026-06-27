import { useEffect, useRef, useState } from "react"
import { KeyIcon } from "@phosphor-icons/react"
import { storage } from "@shared/storage"
import { hashPin } from "@shared/pin"
import type { ToastType } from "@shared/toast"

const PIN_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["⌫", "0"],
] as const

type PinStep = "idle" | "enter" | "confirm"

export function PinChangeWidget({
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
