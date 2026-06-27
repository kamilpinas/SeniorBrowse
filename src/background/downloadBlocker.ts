// Cancel downloads when config.security.blockDownloads is enabled.
// chrome.downloads.onCreated fires before the file is written to disk, so
// cancelling here is safe and leaves no partial file.

export async function handleDownload(
  item: chrome.downloads.DownloadItem,
  blockDownloads: boolean,
): Promise<void> {
  if (!blockDownloads) return

  // Allow the caregiver's own backup file — Settings → Save backup creates
  // it via URL.createObjectURL() inside the extension's own page, so its
  // download URL is always blob:chrome-extension://<this-extension-id>/...
  // A web page cannot forge a blob URL in another origin's namespace, so
  // this check can't be spoofed by a malicious site.
  //
  // This used to ALSO allow-list any download whose suggested filename
  // contained "seniorbrowse-backup-" — but that string comes from the
  // page's own <a download="..."> attribute (or a Content-Disposition
  // header), which a malicious site fully controls. A page naming its
  // payload "seniorbrowse-backup-update.exe" would have sailed straight
  // through the blocker. Only the unspoofable blob-URL check is kept.
  const url = (item.url || "").toLowerCase()
  if (url.startsWith("blob:chrome-extension://")) {
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
