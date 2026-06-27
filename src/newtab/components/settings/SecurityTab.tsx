import { useEffect, useState } from "react"
import { storage } from "@shared/storage"
import type { Config, MalwareList } from "@shared/types"
import type { MessageResponse } from "@shared/messages"
import type { ToastType } from "@shared/toast"
import { Field, textArea, relativeTime, Spinner } from "./shared"

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        width: 48,
        height: 28,
        borderRadius: 14,
        flexShrink: 0,
        background: checked
          ? "var(--color-accent)"
          : "var(--color-surface-edge)",
        border: "none",
        cursor: "pointer",
        padding: 0,
        transition: "background 0.22s",
        boxShadow: checked ? "0 0 0 3px var(--color-accent-light)" : "none",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 23 : 3,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.22s cubic-bezier(0.22,1,0.36,1)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.22)",
        }}
      />
    </button>
  )
}

function SettingRow({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "1rem",
        padding: "0.85rem 1rem",
        borderRadius: "var(--radius-sm)",
        marginBottom: "0.25rem",
        background: "var(--color-surface)",
        border: "1.5px solid var(--color-surface-edge)",
      }}
    >
      <div>
        <div
          style={{
            fontWeight: 600,
            fontSize: "0.95rem",
            color: "var(--color-text)",
            lineHeight: 1.3,
          }}
        >
          {label}
        </div>
        {hint && (
          <div
            style={{
              fontSize: "0.8rem",
              color: "var(--color-text-muted)",
              marginTop: 3,
              lineHeight: 1.4,
            }}
          >
            {hint}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}

function SaveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        marginTop: "1rem",
        padding: "0.7rem 1.5rem",
        background: "var(--color-accent)",
        color: "#fff",
        border: "none",
        borderRadius: "var(--radius-pill)",
        fontSize: "0.95rem",
        fontWeight: 700,
        cursor: "pointer",
        transition:
          "background 0.22s cubic-bezier(0.22,1,0.36,1), transform 0.22s cubic-bezier(0.22,1,0.36,1)",
        alignSelf: "flex-start",
        letterSpacing: "0.01em",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--color-accent-strong)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--color-accent)"
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = "scale(0.97)"
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "scale(1)"
      }}
    >
      Save changes
    </button>
  )
}

export function SecurityTab({
  showToast,
}: {
  showToast: (msg: string, type?: ToastType) => void
}) {
  const [cfg, setCfg] = useState<Config["security"] | null>(null)
  const [bl, setBl] = useState("") // blacklist textarea
  const [malwareUpdatedAt, setMalwareUpdatedAt] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    Promise.all([storage.local.get("config"), storage.local.get("malwareList")])
      .then(([c, malwareList]) => {
        setCfg(c.security)
        setBl(c.security.blacklist.join("\n"))
        setMalwareUpdatedAt(malwareList.updatedAt)
      })
      .catch(() => {})
  }, [])

  if (!cfg) return <Spinner />

  const patchToggle = async (
    key: keyof Pick<Config["security"], "blockDownloads" | "blockAds" | "blockKnownMalware">,
    val: boolean,
  ) => {
    const next = { ...cfg, [key]: val }
    setCfg(next)
    await storage.local.update("config", { security: { [key]: val } })
  }

  const refreshMalwareList = async () => {
    setRefreshing(true)
    try {
      const res = (await chrome.runtime.sendMessage({
        type: "REFRESH_MALWARE_LIST",
      })) as MessageResponse<MalwareList>
      if (res.ok) {
        setMalwareUpdatedAt(res.data.updatedAt)
        showToast("Threat list refreshed")
      } else {
        showToast("Couldn't reach the threat list — try again later", "error")
      }
    } catch {
      showToast("Couldn't reach the threat list — try again later", "error")
    } finally {
      setRefreshing(false)
    }
  }

  // Normalise a free-text line into a bare hostname.
  // Handles entries like "https://google.com/search?q=foo" → "google.com".
  // Entries that are already bare hostnames pass through unchanged.
  const normaliseEntry = (raw: string): string => {
    const s = raw.trim()
    if (!s) return ""
    try {
      // Prepend a protocol if missing so URL() can parse it.
      const withProto = s.includes("://") ? s : `https://${s}`
      return new URL(withProto).hostname.toLowerCase()
    } catch {
      // Not parseable — return as-is (validator in service-worker will just not match it).
      return s.toLowerCase()
    }
  }

  const parseList = (text: string) =>
    text.split("\n").map(normaliseEntry).filter(Boolean)

  const saveListFields = async () => {
    const blacklist = parseList(bl)
    // Normalise the textarea value so the user sees cleaned-up entries.
    setBl(blacklist.join("\n"))
    await storage.local.update("config", { security: { blacklist } })
    showToast("Site list saved")
  }

  // Detect if user typed a full URL so we can show a normalisation hint.
  const hasFullUrl = (text: string) =>
    text.split("\n").some((l) => l.trim().includes("://"))

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <SettingRow
        label="Block downloads"
        hint="Cancel any file download automatically"
      >
        <Toggle
          checked={cfg.blockDownloads}
          onChange={(v) => patchToggle("blockDownloads", v)}
          label="Block downloads"
        />
      </SettingRow>

      <SettingRow
        label="Block ads"
        hint="Hide ads and tracking scripts on all websites"
      >
        <Toggle
          checked={cfg.blockAds}
          onChange={(v) => patchToggle("blockAds", v)}
          label="Block ads"
        />
      </SettingRow>

      <SettingRow
        label="Block known malicious sites"
        hint="Stop known malware and phishing domains before they load — works fully offline, no account needed"
      >
        <Toggle
          checked={cfg.blockKnownMalware}
          onChange={(v) => patchToggle("blockKnownMalware", v)}
          label="Block known malicious sites"
        />
      </SettingRow>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          padding: "0.6rem 0",
          fontSize: "0.8rem",
          color: "var(--color-text-muted)",
        }}
      >
        <span>
          Threat list {malwareUpdatedAt ? `updated ${relativeTime(malwareUpdatedAt)}` : "not yet updated"}
        </span>
        <button
          type="button"
          onClick={() => void refreshMalwareList()}
          disabled={refreshing}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-accent)",
            fontWeight: 600,
            fontSize: "0.8rem",
            cursor: refreshing ? "default" : "pointer",
            opacity: refreshing ? 0.6 : 1,
            padding: 0,
          }}
        >
          {refreshing ? "Updating…" : "Update now"}
        </button>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          paddingTop: "0.75rem",
        }}
      >
        <Field label="Always block these sites (one per line)">
          <textarea
            value={bl}
            style={textArea}
            placeholder="example-scam.com"
            onChange={(e) => setBl((e.target as HTMLTextAreaElement).value)}
          />
          {hasFullUrl(bl) && (
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
              ℹ️ Full URLs will be trimmed to hostname on save (e.g. https://example.com/path → example.com)
            </p>
          )}
        </Field>

        <SaveBtn onClick={saveListFields} />
      </div>
    </div>
  )
}
