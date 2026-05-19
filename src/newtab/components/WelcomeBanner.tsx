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
            <span
              style={{
                color: 'var(--color-accent)',
                display: 'inline',
                fontWeight: 800,
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
