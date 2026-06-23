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
    // register-license is the one network call the wizard makes; everything
    // else here (storage, WebCrypto PIN hashing, the gating reload) is real.
    await context.route("**/functions/v1/register-license", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          licenseKey: "e2e-license-key",
          status: "trial",
          trialEndsAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
        }),
      }),
    )

    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/newtab/index.html`)

    await page.getByRole("button", { name: /Start setup/ }).click()

    await expect(page.getByText("Start your free 7-day trial")).toBeVisible()
    await page.getByPlaceholder(/example\.com/).fill("grandma@example.com")
    await page.getByRole("button", { name: /Continue/ }).click()

    // Steps 2-6 (names, shortcuts, shortcut size, theme, security) are each
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

test(
  "shows a server-rejection error and never registers a subscription",
  async ({ context, extensionId, serviceWorker }) => {
    await context.route("**/functions/v1/register-license", (route) =>
      route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ reason: "device" }),
      }),
    )

    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/newtab/index.html`)
    await page.getByRole("button", { name: /Start setup/ }).click()

    await expect(page.getByText("Start your free 7-day trial")).toBeVisible()
    await page.getByPlaceholder(/example\.com/).fill("grandma@example.com")
    await page.getByRole("button", { name: /Continue/ }).click()

    await expect(page.getByText(/already used its free trial/)).toBeVisible()
    await expect(page.getByText("Start your free 7-day trial")).toBeVisible()

    const stored = (await serviceWorker.evaluate(() =>
      chrome.storage.local.get("subscription"),
    )) as { subscription?: unknown }
    expect(stored.subscription).toBeUndefined()
  },
)
