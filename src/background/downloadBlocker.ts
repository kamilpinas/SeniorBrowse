// B-03: Cancel downloads when config.security.blockDownloads is enabled.
// chrome.downloads.onCreated fires before the file is written to disk, so
// cancelling here is safe and leaves no partial file.

/** Filename prefix used by Settings → Save backup. Allow-listed so the
 *  blocker doesn't cancel our own backup file when blockDownloads is on. */
const BACKUP_FILENAME_PREFIX = "seniorbrowse-backup-"

export async function handleDownload(
  item: chrome.downloads.DownloadItem,
  blockDownloads: boolean,
): Promise<void> {
  if (!blockDownloads) return

  // Allow the caregiver's own backup file — it's initiated from inside the
  // extension and the filename is set by our own code, so it's trusted.
  // Without this, "Save backup" appears to do nothing because the blocker
  // cancels the download before the file lands.
  const filename = (item.filename || "").toLowerCase()
  // item.filename may be empty on Created; fall back to checking the URL too.
  const url = (item.url || "").toLowerCase()
  if (
    filename.includes(BACKUP_FILENAME_PREFIX) ||
    url.startsWith("blob:chrome-extension://")
  ) {
    return
  }

  try {
    await chrome.downloads.cancel(item.id)
    // Erase from the downloads shelf so the user doesn't see a cancelled entry.
    await chrome.downloads.erase({ id: item.id })
    console.info('[SeniorBrowse] blocked download:', item.url)
  } catch (err) {
    // Download may have already completed before we could cancel (race condition).
    console.warn('[SeniorBrowse] could not cancel download', item.id, err)
  }
}
