import { useState } from "react"
import { ArrowRightIcon } from "@phosphor-icons/react"
import { heading, body, primaryBtn } from "./shared"

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

// Step 4: Security
export interface SecurityDraft {
  blockDownloads: boolean
  blockAds: boolean
  blockKnownMalware: boolean
}

export function StepSecurity({ onNext }: { onNext: (s: SecurityDraft) => void }) {
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
