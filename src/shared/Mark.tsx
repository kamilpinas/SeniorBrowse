// Mark — wraps a word/phrase with the brand's signature hand-drawn
// wavy underline. Use sparingly: at most once per screen.
//
// The underline is an inline SVG positioned absolutely below the text
// so it inherits the size of whatever it's wrapped around.

import type { CSSProperties, ReactNode } from "react"

interface Props {
  children: ReactNode
  /** Tint colour for the underline (defaults to var(--color-accent)). */
  color?: string
  style?: CSSProperties
}

export function Mark({ children, color = "var(--color-accent)", style }: Props) {
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        paddingBottom: "0.18em",
        ...style,
      }}
    >
      {children}
      <svg
        aria-hidden="true"
        viewBox="0 0 220 14"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "0.42em",
          pointerEvents: "none",
        }}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9 C 25 2, 50 12, 80 6 S 140 12, 170 5 S 210 11, 217 7" />
      </svg>
    </span>
  )
}
