import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { verifyPin } from "@shared/pin"
import { storage } from "@shared/storage"
import { OnboardingWizard } from "../OnboardingWizard"

// Steps 1-5 (Names, Shortcuts, Shortcut size, Theme, Security) are all
// skippable in the wizard itself, so this test skips through them and
// focuses on PIN setup (step 6, security-critical) end to end — the only
// place a PIN is ever created (AdminPinModal only verifies an existing one).

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
  })

  it("walks the skippable steps, sets a PIN, and completes onboarding", async () => {
    const user = userEvent.setup()
    render(<OnboardingWizard onComplete={onComplete} />)

    // Step 0: Welcome
    await user.click(screen.getByRole("button", { name: /Start setup/ }))

    // Steps 1-5 (Names, Shortcuts, Shortcut size, Theme, Security) are
    // optional and individually skippable.
    for (let i = 0; i < 5; i++) {
      // eslint-disable-next-line no-await-in-loop
      const skipBtn = await screen.findByRole("button", { name: /Skip this step/ })
      // eslint-disable-next-line no-await-in-loop
      await user.click(skipBtn)
    }

    // Step 6: PIN — choose, then mismatch on confirm, then match.
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

    // Step 7: Handover — PIN was hashed and saved before this renders.
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
})
