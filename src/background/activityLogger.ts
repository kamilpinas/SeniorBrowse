// B-04: Append entries to the activity log, capped at MAX_LOG_ENTRIES.
// Oldest entries are dropped first when the cap is reached.

import { storage } from '@shared/storage'
import { MAX_LOG_ENTRIES } from '@shared/constants'
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
    // Append and trim to cap — slice(-N) keeps the last N items.
    const next = [...log, entry].slice(-MAX_LOG_ENTRIES)
    await storage.local.set('activityLog', next)
  } catch (err) {
    console.warn('[SeniorWeb] activity log write failed:', err)
  }
}
