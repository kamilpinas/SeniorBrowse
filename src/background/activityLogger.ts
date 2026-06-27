// Append entries to the activity log, capped at MAX_LOG_ENTRIES and
// pruned of anything older than MAX_LOG_AGE_DAYS. Oldest entries are dropped
// first when the count cap is reached.

import { storage } from '@shared/storage'
import { MAX_LOG_ENTRIES, MAX_LOG_AGE_DAYS } from '@shared/constants'
import type { ActivityLogEntry, ActivityType } from '@shared/types'

export async function logActivity(
  url: string,
  title: string,
  type: ActivityType,
): Promise<void> {
  try {
    const log = await storage.local.get('activityLog')
    const entry: ActivityLogEntry = {
      url,
      title: title || url,
      visitedAt: new Date().toISOString(),
      type,
    }
    const cutoff = Date.now() - MAX_LOG_AGE_DAYS * 24 * 60 * 60 * 1000
    const next = [...log, entry]
      .filter((e) => new Date(e.visitedAt).getTime() >= cutoff)
      .slice(-MAX_LOG_ENTRIES)
    await storage.local.set('activityLog', next)
  } catch (err) {
    console.warn('[SeniorBrowse] activity log write failed:', err)
  }
}
