import { useState } from "react"
import { ArrowRightIcon, PaletteIcon } from "@phosphor-icons/react"
import type { ThemeColor } from "@shared/types"
import { ThemeColorPicker } from "../ThemeColorPicker"
import { applyTheme } from "../../hooks/useTheme"
import { heading, body, primaryBtn } from "./shared"

// Step 4b: Theme colour — pick the accent palette.
// Live-preview: applies the chosen palette to the wizard background while
// the caregiver browses options. Persists on Next.
export function StepTheme({
  initial,
  onNext,
}: {
  initial: ThemeColor
  onNext: (color: ThemeColor) => void
}) {
  const [color, setColor] = useState<ThemeColor>(initial)

  // Live preview as the caregiver clicks swatches.
  const previewColor = (next: ThemeColor) => {
    setColor(next)
    // Use the current document theme (light/dark) so we don't switch brightness.
    const isDark = document.documentElement.classList.contains("dark")
    applyTheme(isDark ? "dark" : "light", next)
  }

  return (
    <>
      <div
        style={{ textAlign: "center" as const, color: "var(--color-accent)" }}
      >
        <PaletteIcon size={48} weight="fill" />
      </div>
      <div>
        <h2 id="wizard-theme-title" style={heading}>
          Pick a colour
        </h2>
        <p style={{ ...body, marginTop: "0.5rem" }}>
          Choose the accent colour for buttons, links and highlights. You can
          change it any time in Settings.
        </p>
      </div>

      <ThemeColorPicker
        value={color}
        onChange={previewColor}
        labelledBy="wizard-theme-title"
      />

      <button
        style={primaryBtn}
        onClick={() => onNext(color)}
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
