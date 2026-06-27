import { ArrowRightIcon, HandWavingIcon } from "@phosphor-icons/react"
import { heading, body, primaryBtn } from "./shared"

// Step 0: Welcome — explicitly addressed to the caregiver doing the setup
export function StepWelcome({ onNext }: { onNext: () => void }) {
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
