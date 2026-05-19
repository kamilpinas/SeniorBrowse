// Reusable focus-trap hook for modals and dialogs.
// On mount: moves focus to the first tabbable child.
// Tab/Shift+Tab: cycles within the container without escaping.
// On unmount: restores focus to whatever held it before the trap activated.

import { useEffect, useRef } from "react"

const FOCUSABLE_SELECTORS = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ")

export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
) {
  const prevFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Remember what was focused so we can restore it on close.
    prevFocusRef.current = document.activeElement as HTMLElement

    const getFocusable = () =>
      Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS))

    // Move focus inside the trap immediately.
    getFocusable()[0]?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return
      const els = getFocusable()
      if (els.length === 0) return
      const first = els[0]!
      const last = els[els.length - 1]!

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      // Restore focus to the element that was active before the trap.
      prevFocusRef.current?.focus()
    }
  }, [containerRef])
}
