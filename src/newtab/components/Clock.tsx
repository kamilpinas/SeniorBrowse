import { useEffect, useState } from 'react'

function formatTime(date: Date): string {
  return date.toLocaleTimeString(navigator.language, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(navigator.language, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function Clock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1_000)
    return () => window.clearInterval(id)
  }, [])

  const [time, period] = (() => {
    const str = formatTime(now)
    const match = str.match(/^(.+?)\s*(am|pm|AM|PM)$/)
    return match ? [match[1]!, match[2]!.toLowerCase()] : [str, '']
  })()

  return (
    <time
      dateTime={now.toISOString()}
      data-tour="clock"
      className="sw-fade-up sw-stagger-1"
      style={{ textAlign: 'right', flexShrink: 0 }}
    >
      {/* Large time with subtle AM/PM superscript */}
      <div
        style={{
          fontSize: 'clamp(1.6rem, 2.9vw, 3rem)',
          fontWeight: 700,
          lineHeight: 1.05,
          letterSpacing: '-0.03em',
          color: 'var(--color-text)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-end',
          gap: '0.2rem',
        }}
      >
        {time}
        {period && (
          <span
            style={{
              fontSize: '0.4em',
              fontWeight: 500,
              color: 'var(--color-text-muted)',
              marginTop: '0.22em',
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
            }}
          >
            {period}
          </span>
        )}
      </div>

      {/* Date pill */}
      <div
        style={{
          marginTop: '0.25rem',
          display: 'inline-block',
          padding: '0.22rem 0.75rem',
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-surface-edge)',
          borderRadius: 'var(--radius-pill)',
          fontSize: '0.78rem',
          fontWeight: 500,
          color: 'var(--color-text-muted)',
          letterSpacing: '0.01em',
        }}
      >
        {formatDate(now)}
      </div>
    </time>
  )
}
