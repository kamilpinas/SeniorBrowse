// Shared floating toast — used by both sidepanel and newtab.
// Renders via a portal so it escapes any CSS transform stacking context.
// Designed for elderly users: large, high-contrast, center-screen.

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export type ToastType = 'success' | 'info' | 'error'

export interface ToastState {
  msg: string
  type: ToastType
  key: number   // changes on every show() so React remounts and restarts the animation
}

// 4.5 s total: 0.4 s in + 3.35 s visible + 0.4 s out = 4.15 s, unmount at 4.5 s
const TOAST_MS = 4500

const STYLE: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: '#1a6644', border: 'rgba(255,255,255,0.22)', icon: '✓' },
  info:    { bg: '#a04a1c', border: 'rgba(255,255,255,0.22)', icon: 'ℹ' },
  error:   { bg: '#8b1a1a', border: 'rgba(255,255,255,0.22)', icon: '✕' },
}

// ── FloatingToast ──────────────────────────────────────────────────────────────

interface FloatingToastProps {
  toast: ToastState | null
}

export function FloatingToast({ toast }: FloatingToastProps) {
  if (!toast) return null
  const { bg, border, icon } = STYLE[toast.type]

  return createPortal(
    /* Full-screen scrim — dims the page so the toast is impossible to miss.
       role="status" + aria-live="polite" announces the message to screen readers. */
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483647,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(10, 8, 6, 0.52)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        pointerEvents: 'none',          // let clicks pass through
        padding: '1.5rem',
      }}
    >
      {/* Toast card */}
      <div
        key={toast.key}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem',
          padding: '2.75rem 3rem 2.5rem',
          minWidth: 260,
          maxWidth: 420,
          width: '100%',
          background: bg,
          border: `2.5px solid ${border}`,
          borderRadius: 28,
          boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 8px 24px rgba(0,0,0,0.30)',
          color: '#ffffff',
          textAlign: 'center' as const,
          fontFamily: "'Outfit', ui-sans-serif, system-ui, sans-serif",
          // scale-in + scale-out
          animation: 'sw-toast-in 0.38s cubic-bezier(0.22,1,0.36,1) both, sw-toast-out 0.38s ease 3.74s both',
        }}
      >
        {/* Icon circle */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.18)',
            border: '2.5px solid rgba(255,255,255,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.6rem',
            fontWeight: 900,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>

        {/* Message — uppercase, very large */}
        <span
          style={{
            fontSize: '1.55rem',
            fontWeight: 800,
            letterSpacing: '0.06em',
            lineHeight: 1.25,
            textTransform: 'uppercase' as const,
          }}
        >
          {toast.msg}
        </span>
      </div>
    </div>,
    document.body,
  )
}

// ── useToast ───────────────────────────────────────────────────────────────────

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timerRef          = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => () => { clearTimeout(timerRef.current) }, [])

  const showToast = (msg: string, type: ToastType = 'success') => {
    clearTimeout(timerRef.current)
    setToast({ msg, type, key: Date.now() })
    timerRef.current = setTimeout(() => setToast(null), TOAST_MS)
  }

  return { toast, showToast }
}
