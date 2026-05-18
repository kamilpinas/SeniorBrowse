// B-03: Cancel downloads when config.security.blockDownloads is enabled.
// chrome.downloads.onCreated fires before the file is written to disk, so
// cancelling here is safe and leaves no partial file.

export async function handleDownload(
  item: chrome.downloads.DownloadItem,
  blockDownloads: boolean,
): Promise<void> {
  if (!blockDownloads) return

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
