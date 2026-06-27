import type { Page } from "@playwright/test"
import { test, expect } from "./fixtures"

async function pressDigits(page: Page, digits: string) {
  for (const d of digits) {
    await page.getByRole("button", { name: d, exact: true }).click()
  }
}

test(
  "completes onboarding end-to-end in a real browser and the new PIN works after reload",
  async ({ context, extensionId, serviceWorker }) => {
    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/newtab/index.html`)

    await page.getByRole("button", { name: /Start setup/ }).click()

    // Steps 1-5 (names, shortcuts, shortcut size, theme, security) are each
    // individually skippable.
    for (let i = 0; i < 5; i++) {
      await page.getByRole("button", { name: /Skip this step/ }).click()
    }

    await expect(page.getByText("Choose your PIN")).toBeVisible()
    await pressDigits(page, "1234")
    await expect(page.getByText("Confirm your PIN")).toBeVisible()
    await pressDigits(page, "1234")

    await expect(page.getByRole("heading", { name: /All\s*set/i })).toBeVisible()
    await page.getByRole("button", { name: /Start the quick tour/ }).click()

    await expect
      .poll(async () => {
        const stored = (await serviceWorker.evaluate(() =>
          chrome.storage.local.get("config"),
        )) as { config?: { onboardingDone?: boolean } }
        return stored.config?.onboardingDone
      })
      .toBe(true)

    // Simulate the side panel already being open (App.tsx's panel-closed
    // gate would otherwise hide the Edit-mode button) and reload — proving
    // onboardingDone persisted through real chrome.storage, not a mock.
    await serviceWorker.evaluate(() => chrome.storage.session.set({ panelOpen: true }))
    await page.goto(`chrome-extension://${extensionId}/newtab/index.html`)

    await expect(page.getByRole("button", { name: /Start setup/ })).not.toBeVisible()
    const editBtn = page.getByRole("button", { name: /Edit mode/ })
    await expect(editBtn).toBeVisible()

    // Prove the PIN created during onboarding round-trips through real
    // WebCrypto in the browser (not vitest's polyfill).
    await editBtn.click()
    await expect(page.getByText("Caregiver access")).toBeVisible()
    await pressDigits(page, "1234")
    await expect(page.getByText("Caregiver access")).not.toBeVisible()
  },
)
