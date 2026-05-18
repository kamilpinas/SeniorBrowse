// B-02: Google Safe Browsing v4 — threat check with in-memory session cache.
//
// Results are cached per service-worker lifetime to avoid redundant API calls.
// If VITE_SAFE_BROWSING_KEY is absent (dev / not configured) the check is
// skipped and every URL is considered safe.

const API_KEY = (import.meta.env['VITE_SAFE_BROWSING_KEY'] as string | undefined) ?? ''
const ENDPOINT = 'https://safebrowsing.googleapis.com/v4/threatMatches:find'

export type CheckResult = 'safe' | 'warn' | 'block'

// Social engineering is a softer threat — show a warn page (user can bypass).
// Malware / PHA / unwanted software → hard block.
const WARN_ONLY_TYPES = new Set(['SOCIAL_ENGINEERING'])

// In-memory cache; lives as long as the service worker is alive.
const cache = new Map<string, CheckResult>()

interface SbMatch {
  threatType: string
}

interface SbResponse {
  matches?: SbMatch[]
}

export async function checkUrl(url: string): Promise<CheckResult> {
  if (!API_KEY) return 'safe'

  const hit = cache.get(url)
  if (hit) return hit

  try {
    const res = await fetch(`${ENDPOINT}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client: { clientId: 'seniorbrowse', clientVersion: '0.0.1' },
        threatInfo: {
          threatTypes: [
            'MALWARE',
            'SOCIAL_ENGINEERING',
            'POTENTIALLY_HARMFUL_APPLICATION',
            'UNWANTED_SOFTWARE',
          ],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: [{ url }],
        },
      }),
    })

    if (!res.ok) {
      console.warn('[SeniorBrowse] Safe Browsing API error', res.status)
      return 'safe'
    }

    const data = (await res.json()) as SbResponse

    if (!data.matches || data.matches.length === 0) {
      cache.set(url, 'safe')
      return 'safe'
    }

    // If every match is social-engineering only → warn; otherwise hard block.
    const result: CheckResult = data.matches.every((m) =>
      WARN_ONLY_TYPES.has(m.threatType),
    )
      ? 'warn'
      : 'block'

    cache.set(url, result)
    return result
  } catch (err) {
    // Network errors → fail open (don't block the user on an API outage).
    console.warn('[SeniorBrowse] Safe Browsing check failed:', err)
    return 'safe'
  }
}
