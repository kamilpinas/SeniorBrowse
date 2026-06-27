import { useEffect, useState } from "react"
import { MoonIcon, PaletteIcon, SunIcon } from "@phosphor-icons/react"
import { storage } from "@shared/storage"
import type { Theme, ThemeColor } from "@shared/types"
import type { ToastType } from "@shared/toast"
import { ThemeColorPicker } from "../ThemeColorPicker"
import { applyTheme } from "../../hooks/useTheme"

export function AppearanceWidget({
  showToast,
}: {
  showToast: (msg: string, type?: ToastType) => void
}) {
  const [theme, setTheme] = useState<Theme>("light")
  const [color, setColor] = useState<ThemeColor>("red")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    storage.local
      .get("config")
      .then((c) => {
        setTheme(c.theme ?? "light")
        setColor(c.themeColor ?? "red")
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return null

  const updateColor = async (next: ThemeColor) => {
    setColor(next)
    applyTheme(theme, next)
    await storage.local.update("config", { themeColor: next })
    showToast("Colour updated")
  }

  const toggleBrightness = async () => {
    const next: Theme = theme === "dark" ? "light" : "dark"
    setTheme(next)
    applyTheme(next, color)
    await storage.local.update("config", { theme: next })
  }

  const isDark = theme === "dark"

  return (
    <div
      style={{
        padding: "1rem",
        borderRadius: 12,
        background: "var(--color-surface)",
        border: "1.5px solid var(--color-surface-edge)",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <div>
        <div
          id="appearance-title"
          style={{
            fontWeight: 600,
            fontSize: "0.95rem",
            color: "var(--color-text)",
          }}
        >
          <PaletteIcon
            size={16}
            style={{ verticalAlign: "middle", marginRight: "0.3rem" }}
          />{" "}
          Appearance
        </div>
        <div
          style={{
            fontSize: "0.875rem",
            color: "var(--color-text-muted)",
            marginTop: 2,
          }}
        >
          Pick an accent colour and choose between light or dark.
        </div>
      </div>

      <ThemeColorPicker
        value={color}
        onChange={updateColor}
        labelledBy="appearance-title"
      />

      {/* Brightness — segmented light / dark control */}
      <div
        role="radiogroup"
        aria-label="Brightness"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.5rem",
          padding: "0.3rem",
          borderRadius: "var(--radius-md)",
          background: "var(--color-bg)",
          border: "1.5px solid var(--color-surface-edge)",
        }}
      >
        {(["light", "dark"] as const).map((mode) => {
          const active = (mode === "dark") === isDark
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                if (mode === "dark" ? !isDark : isDark) toggleBrightness()
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
                padding: "0.55rem 0.75rem",
                borderRadius: "calc(var(--radius-md) - 4px)",
                border: "none",
                background: active
                  ? "var(--color-surface-raised)"
                  : "transparent",
                color: active
                  ? "var(--color-text)"
                  : "var(--color-text-muted)",
                fontWeight: active ? 700 : 600,
                fontSize: "0.9rem",
                fontFamily: "inherit",
                cursor: "pointer",
                boxShadow: active ? "var(--shadow-sm)" : "none",
                transition: "background 0.18s, color 0.18s, box-shadow 0.18s",
              }}
            >
              {mode === "light" ? (
                <SunIcon size={16} weight={active ? "fill" : "regular"} />
              ) : (
                <MoonIcon size={16} weight={active ? "fill" : "regular"} />
              )}
              {mode === "light" ? "Light" : "Dark"}
            </button>
          )
        })}
      </div>
    </div>
  )
}
