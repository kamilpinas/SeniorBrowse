// B-05: Server-validated license manager. Replaces trialManager.ts.
//
// Called on every service-worker wake-up. Only contacts the server every
// LICENSE_CHECK_INTERVAL_MS (24 h); uses cached status in between.
// If the server is unreachable the cached status is trusted for up to
// LICENSE_OFFLINE_GRACE_MS (3 days) before the extension locks.

import { storage } from '@shared/storage'
import { LICENSE_CHECK_INTERVAL_MS, LICENSE_OFFLINE_GRACE_MS } from '@shared/constants'
import type { Subscription } from '@shared/types'

const VALIDATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-license`

export async function ensureTrialStatus(): Promise<void> {
  try {
    const sub = await storage.local.get('subscription')

    // No license key yet — user hasn't completed the email step in onboarding.
    // Don't lock; the UI expired guard only triggers on status === "expired".
    if (!sub?.licenseKey) return

    const now = Date.now()
    const lastValidated = sub.lastValidatedAt
      ? new Date(sub.lastValidatedAt).getTime()
      : 0

    // Still within the 24-hour cache window — no network call needed.
    if (lastValidated > 0 && now - lastValidated < LICENSE_CHECK_INTERVAL_MS) return

    // Try to validate with the server.
    let serverStatus: string | null = null
    let daysLeft: number | null = null

    try {
      const res = await fetch(VALIDATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: sub.licenseKey }),
      })
      if (res.ok) {
        const data = await res.json() as {
          status: string
          daysLeft?: number | null
          trialEndsAt?: string | null
          currentPeriodEndsAt?: string | null
          email?: string
        }
        serverStatus = data.status
        daysLeft = data.daysLeft ?? null
        const updated: Subscription = {
          ...sub,
          status: serverStatus as Subscription['status'],
          daysLeft,
          lastValidatedAt: new Date().toISOString(),
          ...(data.trialEndsAt !== undefined && { trialEndsAt: data.trialEndsAt }),
          ...(data.email && { email: data.email }),
        }
        await storage.local.set('subscription', updated)
        return
      }
    } catch {
      // Network error — fall through to offline grace logic.
    }

    // Server unreachable. If last successful check was > 3 days ago, lock.
    // lastValidated === 0 means never validated (just registered) — don't lock.
    if (lastValidated > 0 && now - lastValidated >= LICENSE_OFFLINE_GRACE_MS) {
      await storage.local.set('subscription', {
        ...sub,
        status: 'expired',
      })
    }
  } catch (err) {
    console.warn('[SeniorWeb] license check failed:', err)
  }
}
