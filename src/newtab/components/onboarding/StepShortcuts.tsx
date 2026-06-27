import { useState } from "react"
import {
  ArrowRightIcon,
  MapPinIcon,
  NewspaperIcon,
  PlayIcon,
  PlusIcon,
  UsersIcon,
  XIcon,
} from "@phosphor-icons/react"
import { heading, body, primaryBtn, inputStyle } from "./shared"

export interface PendingShortcut {
  url: string
  label: string
}

interface SuggestionItem extends PendingShortcut {
  icon: React.ReactNode
}

// Step 2: Shortcuts
export function StepShortcuts({
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
      setErr(
        "That doesn't look like a website address. Try something like youtube.com",
      )
      return
    }
    const finalLabel = label.trim() || hostname.replace(/^www\./, "")
    setList((prev) => [...prev, { url: full, label: finalLabel }])
    setUrl("")
    setLabel("")
  }

  const SUGGESTIONS: SuggestionItem[] = [
    {
      url: "https://youtube.com",
      label: "YouTube",
      icon: <PlayIcon size={14} weight="fill" />,
    },
    {
      url: "https://bbc.co.uk/news",
      label: "BBC News",
      icon: <NewspaperIcon size={14} weight="bold" />,
    },
    {
      url: "https://google.com/maps",
      label: "Maps",
      icon: <MapPinIcon size={14} weight="fill" />,
    },
    {
      url: "https://facebook.com",
      label: "Facebook",
      icon: <UsersIcon size={14} weight="bold" />,
    },
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
                onClick={() =>
                  setList((prev) => [...prev, { url: s.url, label: s.label }])
                }
                style={{
                  padding: "0.3rem 0.75rem",
                  borderRadius: 20,
                  border: "1.5px solid var(--color-surface-edge)",
                  background: "transparent",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  color: "var(--color-text)",
                  transition: "background 0.15s, border-color 0.15s",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--color-surface)"
                  e.currentTarget.style.borderColor =
                    "var(--color-accent-light)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent"
                  e.currentTarget.style.borderColor =
                    "var(--color-surface-edge)"
                }}
              >
                {s.icon} <PlusIcon size={12} weight="bold" /> {s.label}
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
          <PlusIcon size={16} weight="bold" /> Add
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
                <XIcon size={14} weight="bold" />
              </button>
            </span>
          ))}
        </div>
      )}

      <button
        style={primaryBtn}
        onClick={() => onNext(list)}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--color-accent-strong)"
          e.currentTarget.style.transform = "scale(1.02)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--color-accent)"
          e.currentTarget.style.transform = "scale(1)"
        }}
      >
        Next <ArrowRightIcon size={18} />
      </button>
    </>
  )
}
