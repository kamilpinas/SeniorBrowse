import { useEffect, useState } from 'react'
import { storage } from '@shared/storage'

function getTimeGreeting(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Good morning'
  if (h >= 12 && h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function WelcomeBanner() {
  const [name, setName]       = useState('')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const config = await storage.local.get('config')
        setName(config.seniorName?.trim() ?? '')
      } catch {
        setName('')
      } finally {
        setVisible(true)
      }
    })()
  }, [])

  const phrase = getTimeGreeting()

  return (
    <header
      data-tour="greeting"
      className="sw-fade-up"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}
    >
      <h1
        style={{
          fontSize: 'clamp(1.6rem, 3.2vw, 3.6rem)',
          fontWeight: 800,
          margin: 0,
          lineHeight: 1.12,
          letterSpacing: '-0.03em',
          color: 'var(--color-text)',
          maxWidth: '72rem',
        }}
      >
        {name ? (
          <>
            {phrase},{' '}
            {/* Brand signature: name set in Instrument Serif italic terracotta.
                Mirrors the .h-display em rule from the design system. */}
            <span
              style={{
                color: 'var(--color-accent)',
                fontFamily:
                  "'Instrument Serif', ui-serif, Georgia, 'Times New Roman', serif",
                fontStyle: 'italic',
                fontWeight: 400,
                fontSize: '1.08em',
                letterSpacing: '-0.01em',
                // Optical baseline nudge — Outfit ExtraBold sits a hair higher
                // than Instrument Serif italic; drop the serif by 0.02em.
                position: 'relative',
                top: '0.02em',
              }}
            >
              {name}
            </span>
            !
          </>
        ) : (
          `${phrase}!`
        )}
      </h1>

      <p
        style={{
          marginTop: '0.4rem',
          marginBottom: 0,
          fontSize: 'clamp(0.875rem, 1.4vw, 1.1rem)',
          color: 'var(--color-text-muted)',
          fontWeight: 400,
          letterSpacing: '0.005em',
        }}
      >
        What would you like to do today?
      </p>
    </header>
  )
}
