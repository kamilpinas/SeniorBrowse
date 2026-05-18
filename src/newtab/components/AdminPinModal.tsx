// PIN entry modal for caregiver admin access.
// Large-button numpad. Auto-submits on 4th digit. Shakes on wrong PIN.
// Locks for 30 seconds after 5 consecutive failed attempts (MF-08).

import { useEffect, useRef, useState } from "react"
import { storage } from "@shared/storage"

interface Props {
  onSuccess: () => void
  onCancel: () => void
}

const NUMPAD_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["⌫", "0"],
]

const MAX_ATTEMPTS = 5
const LOCKOUT_SECONDS = 30

export function AdminPinModal({ onSuccess, onCancel }: Props) {
  const [digits, setDigits] = useState<string[]>([])
  const [shake, setShake] = useState(false)
  const [error, setError] = useState("")
  const [attempts, setAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [countdown, setCountdown] = useState(0)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil

  // Countdown ticker while locked
  useEffect(() => {
    if (!lockedUntil) return
    const tick = () => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000)
      if (remaining <= 0) {
        setLockedUntil(null)
        setAttempts(0)
        setCountdown(0)
        if (countdownRef.current) clearInterval(countdownRef.current)
      } else {
        setCountdown(remaining)
      }
    }
    tick()
    countdownRef.current = setInterval(tick, 500)
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [lockedUntil])

  useEffect(() => {
    if (digits.length === 4 && !isLocked) {
      void verify(digits.join(""))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isLocked) return
      if (e.key >= "0" && e.key <= "9") {
        const k = e.key
        setDigits((prev) => (prev.length < 4 ? [...prev, k] : prev))
      } else if (e.key === "Backspace") {
        setDigits((prev) => prev.slice(0, -1))
        setError("")
      } else if (e.key === "Escape") {
        onCancel()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onCancel, isLocked])

  const handleNumpad = (key: string) => {
    if (shake || isLocked) return
    if (key === "⌫") {
      setDigits((prev) => prev.slice(0, -1))
      setError("")
    } else {
      setDigits((prev) => (prev.length < 4 ? [...prev, key] : prev))
    }
  }

  const verify = async (pin: string) => {
    try {
      const config = await storage.local.get("config")
      if (pin === config.adminPin) {
        onSuccess()
      } else {
        const nextAttempts = attempts + 1
        setAttempts(nextAttempts)
        if (nextAttempts >= MAX_ATTEMPTS) {
          const until = Date.now() + LOCKOUT_SECONDS * 1000
          setLockedUntil(until)
          triggerError(`Too many attempts — wait ${LOCKOUT_SECONDS}s`)
        } else {
          triggerError(`Incorrect PIN (${MAX_ATTEMPTS - nextAttempts} left)`)
        }
      }
    } catch {
      triggerError("Could not check PIN")
    }
  }

  const triggerError = (msg: string) => {
    setShake(true)
    setError(msg)
    setTimeout(() => {
      setShake(false)
      setDigits([])
      if (!isLocked) setError("")
    }, 900)
  }

  // Show recovery hint after the first wrong attempt.
  const showRecoveryHint = attempts >= 1 && !isLocked

  return (
    /* Backdrop */
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10300,
        background: "rgba(28, 24, 20, 0.65)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      {/* Card */}
      <div
        className={`sw-modal-in${shake ? " sw-shake" : ""}`}
        style={{
          background: "var(--color-surface-raised)",
          border: "1.5px solid var(--color-surface-edge)",
          borderRadius: "var(--radius-xl)",
          padding: "2.25rem 1.75rem 1.75rem",
          width: "100%",
          maxWidth: 350,
          boxShadow: "var(--shadow-xl)",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {/* Lock icon in accent circle */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "var(--color-accent-xlight)",
            border: "2px solid var(--color-accent-light)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        {/* Header text */}
        <div>
          <h2
            style={{
              margin: "0 0 0.3rem",
              fontSize: "1.3rem",
              fontWeight: 800,
              color: "var(--color-text)",
              letterSpacing: "-0.02em",
            }}
          >
            Caregiver access
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: "0.9rem",
              color: "var(--color-text-muted)",
              fontWeight: 400,
            }}
          >
            Enter your 4-digit PIN
          </p>
        </div>

        {/* 4-dot indicator */}
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
                      : "var(--color-surface-edge-mid)"
                }`,
                transition: "background 0.15s ease, border-color 0.15s ease",
                transform:
                  digits.length > i && !error ? "scale(1.15)" : "scale(1)",
              }}
            />
          ))}
        </div>

        {/* Error message */}
        <div style={{ minHeight: "1.1rem", marginTop: "-0.75rem" }}>
          {error && (
            <p
              style={{
                margin: 0,
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--color-accent)",
              }}
            >
              {isLocked ? `Too many attempts — try again in ${countdown}s` : error}
            </p>
          )}
        </div>

        {/* Numpad — replaced by countdown display while locked */}
        {isLocked ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
              padding: "1.25rem 0",
            }}
          >
            <span style={{ fontSize: "3rem", fontWeight: 800, color: "var(--color-accent)", lineHeight: 1 }}>
              {countdown}
            </span>
            <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
              seconds remaining
            </span>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              width: "100%",
            }}
          >
            {NUMPAD_ROWS.map((row, ri) => (
              <div
                key={ri}
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  justifyContent: row.length < 3 ? "center" : "stretch",
                }}
              >
                {row.map((key) => (
                  <NumKey
                    key={key}
                    k={key}
                    row={row}
                    shake={shake}
                    onPress={handleNumpad}
                  />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Cancel */}
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--color-text-muted)",
            fontSize: "0.9rem",
            fontWeight: 600,
            cursor: "pointer",
            padding: "0.25rem 0.75rem",
            borderRadius: 8,
            fontFamily: "inherit",
            transition: "color 0.12s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--color-text)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--color-text-muted)"
          }}
        >
          Cancel
        </button>

        {/* PIN recovery hint — shown after first wrong attempt */}
        {showRecoveryHint && (
          <p
            style={{
              margin: 0,
              fontSize: "0.78rem",
              color: "var(--color-text-muted)",
              lineHeight: 1.5,
              maxWidth: 260,
              textAlign: "center",
            }}
          >
            Forgot your PIN?{" "}
            <strong style={{ color: "var(--color-text)" }}>
              The original default is 1234.
            </strong>{" "}
            If you changed it, open Settings and look under Profile, or reinstall
            the extension to reset everything.
          </p>
        )}
      </div>
    </div>
  )
}

// ── NumKey sub-component for hover state management ───────────────────────────

function NumKey({
  k,
  row,
  shake,
  onPress,
}: {
  k: string
  row: string[]
  shake: boolean
  onPress: (key: string) => void
}) {
  const [hov, setHov] = useState(false)

  return (
    <button
      type="button"
      disabled={shake}
      onClick={() => onPress(k)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: row.length === 3 ? 1 : undefined,
        width: row.length < 3 ? 72 : undefined,
        height: 64,
        fontSize: k === "⌫" ? "1.1rem" : "1.5rem",
        fontWeight: 600,
        fontFamily: "inherit",
        background: hov ? "var(--color-accent-xlight)" : "var(--color-surface)",
        border: `1.5px solid ${hov ? "var(--color-accent-light)" : "var(--color-surface-edge)"}`,
        borderRadius: 14,
        cursor: shake ? "default" : "pointer",
        color: hov ? "var(--color-accent)" : "var(--color-text)",
        transition:
          "background 0.12s, border-color 0.12s, color 0.12s, transform 0.1s",
        transform: hov ? "scale(1.04)" : "scale(1)",
        userSelect: "none",
      }}
    >
      {k}
    </button>
  )
}
