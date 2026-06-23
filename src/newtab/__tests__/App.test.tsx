import { describe, it, expect, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { storage } from "@shared/storage"
import type { Subscription } from "@shared/types"
import {
  installChromeMock,
  type ChromeMock,
} from "../../__tests__/helpers/chromeMock"
import { App } from "../App"

function expiredSubscription(email: string): Subscription {
  return {
    status: "expired",
    licenseKey: "test-license-key",
    email,
    trialEndsAt: null,
    lastValidatedAt: new Date().toISOString(),
    daysLeft: null,
  }
}

// App.tsx is the top-level gate: it decides, before anything else renders,
// whether the senior sees the expired-trial screen (U-02), the onboarding
// wizard (O-01), the "open your panel first" gate, or the real newtab UI.
// Unlike AdminPinModal/OnboardingWizard/SettingsModal — which only touch
// @shared/storage — App also talks to chrome.storage.session/onChanged and
// chrome.runtime.sendMessage directly (via useTheme/useFontSize/useAdminMode
// and its own effects), so it needs a real chrome mock installed *before*
// render (those calls aren't routed through the @shared/storage wrapper).

function setConfig(overrides: Record<string, unknown> = {}) {
  return storage.local.update("config", { onboardingDone: true, ...overrides })
}

/** Invoke every registered chrome.storage.onChanged listener — several
 *  hooks (useTheme, useFontSize, App itself) each add their own, and each
 *  one already filters on `area` / which key changed, so it's safe to fan
 *  the same change out to all of them. */
function fireStorageChange(
  mock: ChromeMock,
  changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
  area: "local" | "session",
) {
  for (const call of mock.storage.onChanged.addListener.mock.calls) {
    ;(call[0] as (c: typeof changes, a: string) => void)(changes, area)
  }
}

describe("App", () => {
  let chromeMock: ChromeMock

  beforeEach(async () => {
    await storage.local.clear()
    await storage.session.clear()
    chromeMock = installChromeMock()
  })

  it("shows the onboarding wizard when setup has never been completed", async () => {
    // Default config has onboardingDone: false.
    render(<App />)
    expect(await screen.findByRole("button", { name: /Start setup/ })).toBeInTheDocument()
  })

  it("shows the expired-trial gate ahead of everything else, even mid-onboarding", async () => {
    // onboardingDone is left false (default) — the expired guard must still
    // win, per the U-02 comment at the top of App.tsx.
    await storage.local.set("subscription", expiredSubscription("grandma@example.com"))
    render(<App />)
    expect(await screen.findByRole("heading", { name: "Just a short pause" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Start setup/ })).not.toBeInTheDocument()
  })

  it("shows the panel-closed gate once onboarding is done but the helper panel hasn't been opened", async () => {
    await setConfig()
    render(<App />)
    const openBtn = await screen.findByRole("button", { name: /Open your helper panel/ })
    const user = userEvent.setup()
    await user.click(openBtn)
    await waitFor(() =>
      expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith({
        type: "OPEN_SIDE_PANEL",
      }),
    )
  })

  it("renders the real newtab UI once onboarding is done and the panel is open", async () => {
    await setConfig()
    await chromeMock.storage.session.set({ panelOpen: true })
    render(<App />)

    // Panel-closed gate is gone; the caregiver's PIN-gated edit button is there.
    expect(await screen.findByRole("button", { name: /Edit mode/ })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Open your helper panel/ })).not.toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: /Edit mode/ }))
    expect(await screen.findByText("Caregiver access")).toBeInTheDocument()
  })

  it("locks the screen immediately when the subscription flips to expired mid-session (B-11)", async () => {
    await setConfig()
    await chromeMock.storage.session.set({ panelOpen: true })
    render(<App />)
    await screen.findByRole("button", { name: /Edit mode/ })

    fireStorageChange(
      chromeMock,
      { subscription: { newValue: { status: "expired", email: "grandma@example.com" } } },
      "local",
    )

    expect(await screen.findByRole("heading", { name: "Just a short pause" })).toBeInTheDocument()
  })
})
