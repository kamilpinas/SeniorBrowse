import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { verifyPin } from "@shared/pin"
import { storage } from "@shared/storage"
import type { SavedLink, ActivityLogEntry } from "@shared/types"
import { installChromeMock } from "../../../__tests__/helpers/chromeMock"
import { SettingsModal } from "../SettingsModal"

// The Settings modal opens on the "General" tab by default, which is where
// the in-place "Change PIN" widget (PinChangeWidget) lives — it's the only
// place a caregiver can rotate their PIN after onboarding, so its
// mismatch/retry/success handling is worth covering the same way
// AdminPinModal (verify) and OnboardingWizard (initial creation) are.

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function pressDigits(digits: string) {
  for (const d of digits) {
    // eslint-disable-next-line no-await-in-loop
    fireEvent.click(screen.getByRole("button", { name: d }))
  }
}

async function switchTab(name: string) {
  fireEvent.click(await screen.findByRole("tab", { name }))
}

describe("SettingsModal — PinChangeWidget", () => {
  let onClose: ReturnType<typeof vi.fn<() => void>>
  let onStartSeniorTour: ReturnType<typeof vi.fn<() => void>>

  beforeEach(async () => {
    await storage.local.clear()
    onClose = vi.fn<() => void>()
    onStartSeniorTour = vi.fn<() => void>()
  })

  it("changes the PIN after a mismatch-then-match retry, and shows a success toast", async () => {
    render(<SettingsModal onClose={onClose} onStartSeniorTour={onStartSeniorTour} />)

    const changeBtn = await screen.findByRole("button", { name: /Change PIN/ })
    fireEvent.click(changeBtn)

    await screen.findByText("Enter new PIN")
    await pressDigits("5678")
    await waitFor(() => expect(screen.getByText("Confirm new PIN")).toBeInTheDocument())

    await pressDigits("0000")
    await waitFor(() =>
      expect(screen.getByText("PINs don't match — try again")).toBeInTheDocument(),
    )
    // Mismatch resets back to the "enter" phase after 900ms.
    await sleep(1000)
    await waitFor(() => expect(screen.getByText("Enter new PIN")).toBeInTheDocument())

    await pressDigits("5678")
    await waitFor(() => expect(screen.getByText("Confirm new PIN")).toBeInTheDocument())
    await pressDigits("5678")

    await screen.findByText("PIN changed successfully")

    const config = await storage.local.get("config")
    expect(await verifyPin("5678", config.pinHash, config.pinSalt)).toBe(true)
    expect(await verifyPin("1234", config.pinHash, config.pinSalt)).toBe(false)

    // Widget collapses back to its idle "Change PIN" button after success.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Change PIN/ })).toBeInTheDocument(),
    )
  }, 15000)

  it("discards the in-progress entry and returns to idle when Cancel is clicked", async () => {
    render(<SettingsModal onClose={onClose} onStartSeniorTour={onStartSeniorTour} />)

    const changeBtn = await screen.findByRole("button", { name: /Change PIN/ })
    fireEvent.click(changeBtn)

    await screen.findByText("Enter new PIN")
    await pressDigits("11")
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Change PIN/ })).toBeInTheDocument(),
    )
    // No PIN change was persisted — config still has its untouched defaults.
    const config = await storage.local.get("config")
    expect(config.pinHash).toBe("")
    expect(config.pinSalt).toBe("")
  })
})

describe("SettingsModal — SecurityTab", () => {
  let onClose: ReturnType<typeof vi.fn<() => void>>
  let onStartSeniorTour: ReturnType<typeof vi.fn<() => void>>

  beforeEach(async () => {
    await storage.local.clear()
    onClose = vi.fn<() => void>()
    onStartSeniorTour = vi.fn<() => void>()
    // The "Update now" control sends REFRESH_MALWARE_LIST to the background.
    installChromeMock()
  })

  it("toggles Block downloads and persists the change", async () => {
    render(<SettingsModal onClose={onClose} onStartSeniorTour={onStartSeniorTour} />)
    await switchTab("Safety")

    const toggle = await screen.findByRole("switch", { name: "Block downloads" })
    expect(toggle).toHaveAttribute("aria-checked", "true") // DEFAULT_CONFIG.security.blockDownloads
    fireEvent.click(toggle)
    await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "false"))

    const config = await storage.local.get("config")
    expect(config.security.blockDownloads).toBe(false)
  })

  it("toggles Block known malicious sites and persists the change", async () => {
    render(<SettingsModal onClose={onClose} onStartSeniorTour={onStartSeniorTour} />)
    await switchTab("Safety")

    const toggle = await screen.findByRole("switch", { name: "Block known malicious sites" })
    expect(toggle).toHaveAttribute("aria-checked", "true") // DEFAULT_CONFIG.security.blockKnownMalware
    fireEvent.click(toggle)
    await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "false"))

    const config = await storage.local.get("config")
    expect(config.security.blockKnownMalware).toBe(false)
  })

  it("refreshes the threat list on demand and shows the new updated-at time", async () => {
    const updatedAt = "2026-06-27T12:00:00.000Z"
    const mock = installChromeMock()
    mock.runtime.sendMessage = vi.fn(async () => ({
      ok: true,
      data: { domains: [], updatedAt },
    }))

    render(<SettingsModal onClose={onClose} onStartSeniorTour={onStartSeniorTour} />)
    await switchTab("Safety")

    await screen.findByText(/not yet updated/)
    fireEvent.click(screen.getByRole("button", { name: "Update now" }))

    await screen.findByText(/Threat list refreshed/)
    await screen.findByText(/Threat list updated/)
  })

  it("normalises full URLs to bare hostnames when saving the block list", async () => {
    render(<SettingsModal onClose={onClose} onStartSeniorTour={onStartSeniorTour} />)
    await switchTab("Safety")

    const blockList = await screen.findByLabelText(/Always block these sites/)
    fireEvent.change(blockList, { target: { value: "https://example-scam.com/phish" } })

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(async () => {
      const config = await storage.local.get("config")
      expect(config.security.blacklist).toEqual(["example-scam.com"])
    })
  })
})

describe("SettingsModal — SavedLinksTab", () => {
  let onClose: ReturnType<typeof vi.fn<() => void>>
  let onStartSeniorTour: ReturnType<typeof vi.fn<() => void>>

  beforeEach(async () => {
    await storage.local.clear()
    onClose = vi.fn<() => void>()
    onStartSeniorTour = vi.fn<() => void>()
    // SavedLinksTab listens on chrome.storage.onChanged directly (to re-sort
    // live when the side panel saves a page), unlike the other tabs here.
    installChromeMock()
  })

  it("shows an empty state when there are no saved pages", async () => {
    render(<SettingsModal onClose={onClose} onStartSeniorTour={onStartSeniorTour} />)
    await switchTab("Saved pages")
    expect(await screen.findByText(/No saved pages yet/)).toBeInTheDocument()
  })

  it("deletes a saved link after confirming", async () => {
    const link: SavedLink = {
      id: "l1",
      url: "https://example.com/page",
      title: "Example Page",
      savedAt: new Date().toISOString(),
    }
    await storage.local.set("savedLinks", [link])
    render(<SettingsModal onClose={onClose} onStartSeniorTour={onStartSeniorTour} />)
    await switchTab("Saved pages")

    await screen.findByText("Example Page")
    fireEvent.click(screen.getByRole("button", { name: "Delete Example Page" }))
    fireEvent.click(screen.getByRole("button", { name: "Delete" }))

    await waitFor(() => expect(screen.queryByText("Example Page")).not.toBeInTheDocument())
    const links = await storage.local.get("savedLinks")
    expect(links).toEqual([])
  })

  it("adds a saved link as a home-screen shortcut, then disables the button", async () => {
    const link: SavedLink = {
      id: "l1",
      url: "https://example.com/page",
      title: "Example Page",
      savedAt: new Date().toISOString(),
    }
    await storage.local.set("savedLinks", [link])
    await storage.local.set("shortcuts", [])
    render(<SettingsModal onClose={onClose} onStartSeniorTour={onStartSeniorTour} />)
    await switchTab("Saved pages")

    const addBtn = await screen.findByRole("button", { name: /Shortcut/ })
    fireEvent.click(addBtn)

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Added/ })).toBeDisabled(),
    )
    const shortcuts = await storage.local.get("shortcuts")
    expect(shortcuts).toHaveLength(1)
    expect(shortcuts[0]?.url).toBe(link.url)
  })
})

describe("SettingsModal — ActivityLogTab", () => {
  let onClose: ReturnType<typeof vi.fn<() => void>>
  let onStartSeniorTour: ReturnType<typeof vi.fn<() => void>>

  beforeEach(async () => {
    await storage.local.clear()
    onClose = vi.fn<() => void>()
    onStartSeniorTour = vi.fn<() => void>()
  })

  it("shows an empty state when there is no browsing activity yet", async () => {
    render(<SettingsModal onClose={onClose} onStartSeniorTour={onStartSeniorTour} />)
    await switchTab("Activity log")
    expect(await screen.findByText(/No pages visited yet/)).toBeInTheDocument()
  })

  it("filters entries by search term across title and URL", async () => {
    const entries: ActivityLogEntry[] = [
      { url: "https://news.example.com", title: "Daily News", visitedAt: new Date().toISOString(), type: "visit" },
      { url: "https://weather.example.com", title: "Weather Today", visitedAt: new Date().toISOString(), type: "visit" },
    ]
    await storage.local.set("activityLog", entries)
    render(<SettingsModal onClose={onClose} onStartSeniorTour={onStartSeniorTour} />)
    await switchTab("Activity log")

    await screen.findByText("Daily News")
    expect(screen.getByText("Weather Today")).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText("Search pages…"), {
      target: { value: "weather" },
    })

    await waitFor(() => expect(screen.queryByText("Daily News")).not.toBeInTheDocument())
    expect(screen.getByText("Weather Today")).toBeInTheDocument()
  })

  it("clears the log after confirming, persists it, and shows a toast", async () => {
    const entries: ActivityLogEntry[] = [
      { url: "https://news.example.com", title: "Daily News", visitedAt: new Date().toISOString(), type: "visit" },
    ]
    await storage.local.set("activityLog", entries)
    render(<SettingsModal onClose={onClose} onStartSeniorTour={onStartSeniorTour} />)
    await switchTab("Activity log")

    await screen.findByText("Daily News")
    fireEvent.click(screen.getByRole("button", { name: /Clear log/ }))
    fireEvent.click(screen.getByRole("button", { name: "Confirm clear" }))

    await waitFor(() => expect(screen.queryByText("Daily News")).not.toBeInTheDocument())
    await screen.findByText("Activity log cleared")
    const log = await storage.local.get("activityLog")
    expect(log).toEqual([])
  })
})
