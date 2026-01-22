// B-05: Initialise and refresh the subscription/trial status.
//
// Called on install and every time the service worker starts, so the stored
// status always reflects the current moment.

import { storage } from '@shared/storage'
import { TRIAL_DAYS, GRACE_DAYS } from '@shared/constants'
import type { Subscription, SubscriptionStatus } from '@shared/types'

const MS_PER_DAY = 86_400_000

export async function ensureTrialStatus(): Promise<void> {
  try {
    let sub = await storage.local.get('subscription')

    if (!sub) {
      // First run — create a fresh trial record.
      const installedAt = new Date()
      const graceEndsAt = new Date(
        installedAt.getTime() + (TRIAL_DAYS + GRACE_DAYS) * MS_PER_DAY,
      )
      const fresh: Subscription = {
        status: 'trial',
        installedAt: installedAt.toISOString(),
        graceEndsAt: graceEndsAt.toISOString(),
      }
      await storage.local.set('subscription', fresh)
      return
    }

    // Recompute status based on current time.
    const now = Date.now()
    const trialEnds = new Date(sub.installedAt).getTime() + TRIAL_DAYS * MS_PER_DAY
    const graceEnds = new Date(sub.graceEndsAt).getTime()

    let status: SubscriptionStatus
    if (now < trialEnds) {
      status = 'trial'
    } else if (now < graceEnds) {
      status = 'grace'
    } else {
      status = 'expired'
    }

    if (status !== sub.status) {
      await storage.local.set('subscription', { ...sub, status })
    }
  } catch (err) {
    console.warn('[SeniorWeb] trial status check failed:', err)
  }
}
