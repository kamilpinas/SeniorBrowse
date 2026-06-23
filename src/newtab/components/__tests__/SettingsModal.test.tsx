import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { verifyPin } from "@shared/pin"
import { storage } from "@shared/storage"
import type { SavedLink, ActivityLogEntry, Subscription } from "@shared/types"
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

  it("switches the suspicious-link protection mode and persists it", async () => {
    render(<SettingsModal onClose={onClose} onStartSeniorTour={onStartSeniorTour} />)
    await switchTab("Safety")

    const warnRadio = await screen.findByRole("radio", { name: /Warn before visiting/ })
    expect(warnRadio).toHaveAttribute("aria-checked", "true") // default mode is "warn"

    const blockRadio = screen.getByRole("radio", { name: /Block dangerous sites/ })
    fireEvent.click(blockRadio)

    await waitFor(() => expect(blockRadio).toHaveAttribute("aria-checked", "true"))
    const config = await storage.local.get("config")
    expect(config.security.blockSuspiciousLinks).toBe("block")
  })

  it("normalises full URLs to bare hostnames when saving the allow/block lists", async () => {
    render(<SettingsModal onClose={onClose} onStartSeniorTour={onStartSeniorTour} />)
    await switchTab("Safety")

    const allowList = await screen.findByLabelText(/Always allow these sites/)
    fireEvent.change(allowList, {
      target: { value: "https://google.com/search?q=foo\nyoutube.com" },
    })
    const blockList = screen.getByLabelText(/Always block these sites/)
    fireEvent.change(blockList, { target: { value: "https://example-scam.com/phish" } })

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(async () => {
      const config = await storage.local.get("config")
      expect(config.security.whitelist).toEqual(["google.com", "youtube.com"])
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

describe("SettingsModal — TrialTab", () => {
  let onClose: ReturnType<typeof vi.fn<() => void>>
  let onStartSeniorTour: ReturnType<typeof vi.fn<() => void>>

  beforeEach(async () => {
    await storage.local.clear()
    onClose = vi.fn<() => void>()
    onStartSeniorTour = vi.fn<() => void>()
    // TrialTab always fires a validate-license fetch on mount when a
    // licenseKey is cached. VITE_SUPABASE_URL points at a real project in
    // this repo's .env, so every test here MUST stub fetch — otherwise it'd
    // make a real network call to production Supabase. Default to a
    // same-tick failure so cached data is left untouched unless a test
    // overrides this with its own success response.
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })))
  })

  it("shows an empty state when no account exists", async () => {
    render(<SettingsModal onClose={onClose} onStartSeniorTour={onStartSeniorTour} />)
    await switchTab("Billing")
    expect(await screen.findByText(/No account found/)).toBeInTheDocument()
  })

  it("shows cached trial status, days remaining, and account stats", async () => {
    const sub: Subscription = {
      status: "trial",
      licenseKey: "lic-1",
      email: "grandma@example.com",
      trialEndsAt: new Date(Date.now() + 3 * 86_400_000).toISOString(),
      lastValidatedAt: null,
      daysLeft: 3,
    }
    await storage.local.set("subscription", sub)
    await storage.local.set("activityLog", [
      { url: "https://a.com", title: "A", visitedAt: new Date().toISOString(), type: "visit" },
    ])

    render(<SettingsModal onClose={onClose} onStartSeniorTour={onStartSeniorTour} />)
    await switchTab("Billing")

    expect(await screen.findByText("Free trial active")).toBeInTheDocument()
    expect(screen.getByText("3 days remaining")).toBeInTheDocument()
    expect(screen.getByText("grandma@example.com")).toBeInTheDocument()
    expect(screen.getByText("1")).toBeInTheDocument() // Pages visited stat
  })

  it("refreshes subscription status from the server and persists the result", async () => {
    const sub: Subscription = {
      status: "trial",
      licenseKey: "lic-1",
      email: "grandma@example.com",
      trialEndsAt: new Date(Date.now() + 3 * 86_400_000).toISOString(),
      lastValidatedAt: null,
      daysLeft: 3,
    }
    await storage.local.set("subscription", sub)
    await storage.local.set("activityLog", [])
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          status: "active",
          daysLeft: null,
          trialEndsAt: null,
          currentPeriodEndsAt: null,
        }),
      })),
    )

    render(<SettingsModal onClose={onClose} onStartSeniorTour={onStartSeniorTour} />)
    await switchTab("Billing")

    await waitFor(() => expect(screen.getByText("Subscription active")).toBeInTheDocument())
    const updated = await storage.local.get("subscription")
    expect(updated?.status).toBe("active")
    // email isn't returned by validate-license anymore — the cached value must survive.
    expect(updated?.email).toBe("grandma@example.com")
  })
})
