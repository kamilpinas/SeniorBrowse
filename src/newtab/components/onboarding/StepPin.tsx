import { useEffect, useRef, useState } from "react"
import { LockSimpleIcon } from "@phosphor-icons/react"
import { hashPin } from "@shared/pin"
import { heading, body } from "./shared"

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

export function StepPin({
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
