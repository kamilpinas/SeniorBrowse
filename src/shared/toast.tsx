// Shared floating toast — used by both sidepanel and newtab.
// Renders via a portal so it escapes any CSS transform stacking context.
//
// Design notes:
// - Top-center floating card, NOT a blocking full-screen scrim. The page
//   below stays interactive while the toast is up.
// - Dismissible: ✕ button (44×44 tap target) and Escape key. Auto-dismiss
//   still runs as a safety net so a toast never gets stuck.
// - Large, high-contrast, accessible for elderly users — but no longer
//   screen-filling.

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export type ToastType = 'success' | 'info' | 'error'

export interface ToastState {
  msg: string
  type: ToastType
  /** Changes on every show() so React remounts (restarts the enter animation). */
  key: number
  /** Set by closeToast() — triggers the exit transition before unmount. */
  closing?: boolean
}

// Auto-dismiss after 5 s. Long enough for slow readers, short enough not to
// feel sticky — and the user can hit ✕ or Escape to leave sooner.
const AUTO_DISMISS_MS = 5000
// Exit transition duration — keep in sync with the inline `transition` on
// the card. We wait this long before unmounting so the slide-out plays.
const EXIT_MS = 220

const STYLE: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: '#1a6644', border: 'rgba(255,255,255,0.22)', icon: '✓' },
  info:    { bg: '#a04a1c', border: 'rgba(255,255,255,0.22)', icon: 'ℹ' },
  error:   { bg: '#8b1a1a', border: 'rgba(255,255,255,0.22)', icon: '✕' },
}

// ── FloatingToast ──────────────────────────────────────────────────────────────

interface FloatingToastProps {
  toast: ToastState | null
  /** Called when the user dismisses via ✕ or Escape. Optional so old
   *  call sites still compile, but every caller in this repo passes it. */
  onClose?: () => void
}

export function FloatingToast({ toast, onClose }: FloatingToastProps) {
  // Two-step mount so the CSS transition fires after the element is in the DOM.
  // false = pre-enter (offscreen + transparent), true = visible.
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (toast && !toast.closing) {
      // Next frame → trigger the transition from offscreen to in-place.
      const id = requestAnimationFrame(() => setShown(true))
      return () => cancelAnimationFrame(id)
    }
    setShown(false)
    return undefined
  }, [toast?.key, toast?.closing])

  // Escape dismisses the toast. We capture in the capture phase and call
  // stopImmediatePropagation so the toast wins over any other component
  // that also listens for Escape (e.g. a Settings modal under the toast).
  useEffect(() => {
    if (!toast || !onClose || toast.closing) return undefined
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [toast, onClose])

  if (!toast) return null
  const { bg, border, icon } = STYLE[toast.type]
  const visible = shown && !toast.closing

  return createPortal(
    /* Top-center floating container. NO full-screen scrim — the page below
       stays interactive. role/aria-live still let screen readers announce. */
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'fixed',
        top: 16,
        left: 0,
        right: 0,
        zIndex: 2147483647,
        display: 'flex',
        justifyContent: 'center',
        padding: '0 16px',
        // The wrapper itself ignores clicks; only the toast card catches them.
        pointerEvents: 'none',
      }}
    >
      <div
        key={toast.key}
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          padding: '0.85rem 0.85rem 0.85rem 1.1rem',
          width: '100%',
          maxWidth: 460,
          background: bg,
          border: `2px solid ${border}`,
          borderRadius: 16,
          boxShadow:
            '0 16px 40px rgba(0,0,0,0.42), 0 4px 12px rgba(0,0,0,0.22)',
          color: '#ffffff',
          fontFamily: "'Outfit', ui-sans-serif, system-ui, sans-serif",
          transform: visible ? 'translateY(0)' : 'translateY(-24px)',
          opacity: visible ? 1 : 0,
          transition:
            'transform 0.3s cubic-bezier(0.22,1,0.36,1), opacity 0.22s ease',
        }}
      >
        {/* Icon badge */}
        <div
          aria-hidden="true"
          style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.18)',
            border: '2px solid rgba(255,255,255,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 900,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>

        {/* Message */}
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: '1.1rem',
            fontWeight: 600,
            letterSpacing: '0.01em',
            lineHeight: 1.35,
            // Long messages wrap rather than overflow.
            wordBreak: 'break-word',
          }}
        >
          {toast.msg}
        </span>

        {/* Close button — 44×44 tap target, white-on-transparent */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss notification"
            style={{
              flexShrink: 0,
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              background: 'transparent',
              border: '1.5px solid rgba(255,255,255,0.45)',
              borderRadius: 12,
              color: '#ffffff',
              fontSize: '1.35rem',
              fontWeight: 800,
              lineHeight: 1,
              fontFamily: 'inherit',
              cursor: 'pointer',
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.18)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.85)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.45)'
            }}
          >
            ✕
          </button>
        )}
      </div>
    </div>,
    document.body,
  )
}

// ── useToast ───────────────────────────────────────────────────────────────────

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)

  // Two timers: one schedules the auto-dismiss (entering closing state),
  // the other unmounts the node after the exit transition finishes.
  useEffect(() => {
    if (!toast || toast.closing) return undefined
    const dismissId = setTimeout(() => {
      setToast((t) => (t ? { ...t, closing: true } : null))
    }, AUTO_DISMISS_MS)
    return () => clearTimeout(dismissId)
  }, [toast?.key, toast?.closing])

  useEffect(() => {
    if (!toast?.closing) return undefined
    const unmountId = setTimeout(() => setToast(null), EXIT_MS)
    return () => clearTimeout(unmountId)
  }, [toast?.closing, toast?.key])

  const showToast = (msg: string, type: ToastType = 'success') => {
    setToast({ msg, type, key: Date.now() })
  }

  const closeToast = () => {
    setToast((t) => (t ? { ...t, closing: true } : null))
  }

  return { toast, showToast, closeToast }
}
