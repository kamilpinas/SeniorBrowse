import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { verifyPin } from "@shared/pin"
import { storage } from "@shared/storage"
import { OnboardingWizard } from "../OnboardingWizard"

// This is the only place a PIN is ever created (AdminPinModal only verifies
// an existing one), so the PIN step's mismatch-then-match handling is the
// highest-value thing to cover here. Steps 2-6 are skippable in the wizard
// itself, so we skip through them and focus on email registration (step 1,
// network-backed) and PIN setup (step 7, security-critical) end to end.

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function pressDigits(digits: string) {
  for (const d of digits) {
    // eslint-disable-next-line no-await-in-loop
    fireEvent.click(screen.getByRole("button", { name: d }))
  }
}

describe("OnboardingWizard", () => {
  let onComplete: ReturnType<typeof vi.fn<() => void>>

  beforeEach(async () => {
    await storage.local.clear()
    onComplete = vi.fn<() => void>()
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          licenseKey: "test-license-key",
          status: "trial",
          trialEndsAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
        }),
      })),
    )
  })

  it("registers the email, walks the skippable steps, sets a PIN, and completes onboarding", async () => {
    const user = userEvent.setup()
    render(<OnboardingWizard onComplete={onComplete} />)

    // Step 0: Welcome
    await user.click(screen.getByRole("button", { name: /Start setup/ }))

    // Step 1: Email — registers against register-license (mocked fetch).
    await screen.findByText("Start your free 7-day trial")
    await user.type(screen.getByPlaceholderText(/example\.com/), "grandma@example.com")
    await user.click(screen.getByRole("button", { name: /Continue/ }))

    // Steps 2-6 (Names, Shortcuts, Shortcut size, Theme, Security) are
    // optional and individually skippable.
    for (let i = 0; i < 5; i++) {
      // eslint-disable-next-line no-await-in-loop
      const skipBtn = await screen.findByRole("button", { name: /Skip this step/ })
      // eslint-disable-next-line no-await-in-loop
      await user.click(skipBtn)
    }

    // Step 7: PIN — choose, then mismatch on confirm, then match.
    await screen.findByText("Choose your PIN")
    await pressDigits("1234")
    await waitFor(() => expect(screen.getByText("Confirm your PIN")).toBeInTheDocument())

    await pressDigits("0000")
    await waitFor(() =>
      expect(screen.getByText("PINs don't match — try again")).toBeInTheDocument(),
    )
    // Mismatch resets back to the "enter" phase after 900ms.
    await sleep(1000)
    await waitFor(() => expect(screen.getByText("Choose your PIN")).toBeInTheDocument())

    await pressDigits("1234")
    await waitFor(() => expect(screen.getByText("Confirm your PIN")).toBeInTheDocument())
    await pressDigits("1234")

    // Step 8: Handover — PIN was hashed and saved before this renders.
    await screen.findByRole("heading", { name: /All\s*set/i })
    const config = await storage.local.get("config")
    expect(config.pinHash).not.toBe("")
    expect(config.pinSalt).not.toBe("")
    expect(await verifyPin("1234", config.pinHash, config.pinSalt)).toBe(true)
    expect(await verifyPin("4321", config.pinHash, config.pinSalt)).toBe(false)

    await user.click(screen.getByRole("button", { name: /Start the quick tour/ }))

    expect(onComplete).toHaveBeenCalledTimes(1)
    const finalConfig = await storage.local.get("config")
    expect(finalConfig.onboardingDone).toBe(true)
  }, 20000)

  it("shows a server-rejection error and does not advance past the email step", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 403,
        json: async () => ({ reason: "device" }),
      })),
    )
    const user = userEvent.setup()
    render(<OnboardingWizard onComplete={onComplete} />)

    await user.click(screen.getByRole("button", { name: /Start setup/ }))
    await screen.findByText("Start your free 7-day trial")
    await user.type(screen.getByPlaceholderText(/example\.com/), "grandma@example.com")
    await user.click(screen.getByRole("button", { name: /Continue/ }))

    await waitFor(() =>
      expect(
        screen.getByText(/already used its free trial/),
      ).toBeInTheDocument(),
    )
    // Still on the email step.
    expect(screen.getByText("Start your free 7-day trial")).toBeInTheDocument()
    const sub = await storage.local.get("subscription")
    expect(sub).toBeNull()
  })
})
