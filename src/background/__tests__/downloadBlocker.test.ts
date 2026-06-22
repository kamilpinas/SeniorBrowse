import { describe, it, expect, beforeEach, vi } from "vitest"
import { installChromeMock, type ChromeMock } from "../../__tests__/helpers/chromeMock"
import { handleDownload } from "../downloadBlocker"

function makeItem(
  overrides: Partial<chrome.downloads.DownloadItem> = {},
): chrome.downloads.DownloadItem {
  return {
    id: 1,
    url: "https://example.com/file.pdf",
    filename: "file.pdf",
    ...overrides,
  } as chrome.downloads.DownloadItem
}

describe("handleDownload", () => {
  let mock: ChromeMock

  beforeEach(() => {
    mock = installChromeMock()
  })

  it("does nothing when blockDownloads is false", async () => {
    await handleDownload(makeItem(), false)
    expect(mock.downloads.cancel).not.toHaveBeenCalled()
    expect(mock.downloads.erase).not.toHaveBeenCalled()
  })

  it("blocks an http:// download when blockDownloads is true", async () => {
    await handleDownload(makeItem({ url: "http://evil.example/payload.exe" }), true)
    expect(mock.downloads.cancel).toHaveBeenCalledWith(1)
    expect(mock.downloads.erase).toHaveBeenCalledWith({ id: 1 })
  })

  it("blocks an https:// download when blockDownloads is true", async () => {
    await handleDownload(makeItem({ url: "https://example.com/file.pdf" }), true)
    expect(mock.downloads.cancel).toHaveBeenCalledWith(1)
  })

  it("allows the extension's own backup blob URL", async () => {
    await handleDownload(
      makeItem({
        id: 2,
        url: "blob:chrome-extension://test-extension-id/abc-123",
        filename: "seniorbrowse-backup-2026.json",
      }),
      true,
    )
    expect(mock.downloads.cancel).not.toHaveBeenCalled()
    expect(mock.downloads.erase).not.toHaveBeenCalled()
  })

  it("is case-insensitive when matching the blob:chrome-extension:// prefix", async () => {
    await handleDownload(
      makeItem({ id: 3, url: "BLOB:CHROME-EXTENSION://test-extension-id/xyz" }),
      true,
    )
    expect(mock.downloads.cancel).not.toHaveBeenCalled()
  })

  it("does NOT trust a spoofed filename on a non-blob URL (filename allow-list removed)", async () => {
    // A malicious page can set <a download="seniorbrowse-backup-..."> on any
    // href it wants — the filename must never bypass the blob:// check.
    await handleDownload(
      makeItem({
        id: 4,
        url: "https://evil.example/malware.exe",
        filename: "seniorbrowse-backup-update.exe",
      }),
      true,
    )
    expect(mock.downloads.cancel).toHaveBeenCalledWith(4)
    expect(mock.downloads.erase).toHaveBeenCalledWith({ id: 4 })
  })

  it("blocks a blob: URL from a non-extension origin", async () => {
    await handleDownload(
      makeItem({ id: 5, url: "blob:https://evil.example/abc-123" }),
      true,
    )
    expect(mock.downloads.cancel).toHaveBeenCalledWith(5)
  })

  it("does not throw when cancel() rejects (download already completed)", async () => {
    mock.downloads.cancel.mockRejectedValueOnce(new Error("already completed"))
    await expect(handleDownload(makeItem({ id: 6 }), true)).resolves.toBeUndefined()
  })

  it("logs a warning instead of throwing when erase() fails after cancel succeeds", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    mock.downloads.erase.mockRejectedValueOnce(new Error("erase failed"))
    await expect(handleDownload(makeItem({ id: 7 }), true)).resolves.toBeUndefined()
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it("treats a download with an empty url as blockable (not an allowed blob)", async () => {
    await handleDownload(makeItem({ id: 8, url: "" }), true)
    expect(mock.downloads.cancel).toHaveBeenCalledWith(8)
  })
})
