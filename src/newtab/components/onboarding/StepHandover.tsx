import { ArrowRightIcon, ConfettiIcon } from "@phosphor-icons/react"
import { Mark } from "@shared/Mark"
import { heading, body, primaryBtn } from "./shared"

// Step 4: Handover
export function StepHandover({
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
