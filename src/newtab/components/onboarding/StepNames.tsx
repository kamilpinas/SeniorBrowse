import { useState } from "react"
import { ArrowRightIcon } from "@phosphor-icons/react"
import { heading, body, primaryBtn, inputStyle } from "./shared"

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

// Step 1: Names
export function StepNames({
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
