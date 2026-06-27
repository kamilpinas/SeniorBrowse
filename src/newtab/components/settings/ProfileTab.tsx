import { useEffect, useState } from "react"
import { ArrowRightIcon, LockSimpleIcon } from "@phosphor-icons/react"
import { storage } from "@shared/storage"
import type { ToastType } from "@shared/toast"
import { Field, textInput, Spinner } from "./shared"
import { PinChangeWidget } from "./PinChangeWidget"
import { AppearanceWidget } from "./AppearanceWidget"
import { ExportDataWidget } from "./ExportDataWidget"

interface ProfileTabProps {
  onStartSeniorTour: () => void
  showToast: (msg: string, type?: ToastType) => void
}

export function ProfileTab({ onStartSeniorTour, showToast }: ProfileTabProps) {
  const [seniorName, setSeniorName] = useState("")
  const [caregiverName, setCaregiverName] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    storage.local
      .get("config")
      .then((c) => {
        setSeniorName(c.seniorName)
        setCaregiverName(c.caregiverName)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  const saveField = async (
    field: "seniorName" | "caregiverName",
    value: string,
  ) => {
    await storage.local.update("config", { [field]: value.trim() })
    showToast("Name saved")
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <p
        style={{
          margin: 0,
          color: "var(--color-text-muted)",
          fontSize: "0.9rem",
        }}
      >
        These names are used in greetings and confirmation messages.
      </p>

      <Field label="Senior's name">
        <input
          type="text"
          value={seniorName}
          style={textInput}
          placeholder="e.g. Halina"
          onChange={(e) => setSeniorName((e.target as HTMLInputElement).value)}
          onBlur={() => saveField("seniorName", seniorName)}
        />
      </Field>

      <Field label="Caregiver's name">
        <input
          type="text"
          value={caregiverName}
          style={textInput}
          placeholder="e.g. Magda"
          onChange={(e) =>
            setCaregiverName((e.target as HTMLInputElement).value)
          }
          onBlur={() => saveField("caregiverName", caregiverName)}
        />
      </Field>

      {/* Start senior walkthrough */}
      <div
        style={{
          marginTop: "0.5rem",
          padding: "1rem",
          borderRadius: 12,
          background: "var(--color-surface)",
          border: "1.5px solid var(--color-surface-edge)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 600,
              fontSize: "0.95rem",
              color: "var(--color-text)",
            }}
          >
            Senior quick tour
          </div>
          <div
            style={{
              fontSize: "0.875rem",
              color: "var(--color-text-muted)",
              marginTop: 2,
            }}
          >
            A friendly 5-step walkthrough to do together
          </div>
        </div>
        <button
          type="button"
          onClick={onStartSeniorTour}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: 10,
            background: "var(--color-accent)",
            color: "#fff",
            border: "none",
            fontSize: "0.9rem",
            fontWeight: 700,
            cursor: "pointer",
            whiteSpace: "nowrap" as const,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--color-accent-strong)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--color-accent)"
          }}
        >
          Start tour <ArrowRightIcon size={15} />
        </button>
      </div>

      {/* Change admin PIN */}
      <div
        style={{
          padding: "1rem",
          borderRadius: 12,
          background: "var(--color-surface)",
          border: "1.5px solid var(--color-surface-edge)",
          display: "flex",
          flexDirection: "column",
          gap: "0.85rem",
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 600,
              fontSize: "0.95rem",
              color: "var(--color-text)",
            }}
          >
            <LockSimpleIcon
              size={16}
              style={{ verticalAlign: "middle", marginRight: "0.3rem" }}
            />{" "}
            Admin PIN
          </div>
          <div
            style={{
              fontSize: "0.875rem",
              color: "var(--color-text-muted)",
              marginTop: 2,
            }}
          >
            4-digit code required to access caregiver settings. Default is{" "}
            <strong>1234</strong> — change it now.
          </div>
        </div>

        <PinChangeWidget showToast={showToast} />
      </div>

      {/* Appearance — accent colour + light/dark */}
      <AppearanceWidget showToast={showToast} />

      {/* Export / backup data */}
      <ExportDataWidget showToast={showToast} />
    </div>
  )
}
