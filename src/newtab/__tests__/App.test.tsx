import { describe, it, expect, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { storage } from "@shared/storage"
import {
  installChromeMock,
  type ChromeMock,
} from "../../__tests__/helpers/chromeMock"
import { App } from "../App"

// App.tsx is the top-level gate: it decides, before anything else renders,
// whether the senior sees the onboarding wizard (O-01), the "open your
// panel first" gate, or the real newtab UI.
// Unlike AdminPinModal/OnboardingWizard/SettingsModal — which only touch
// @shared/storage — App also talks to chrome.storage.session/onChanged and
// chrome.runtime.sendMessage directly (via useTheme/useFontSize/useAdminMode
// and its own effects), so it needs a real chrome mock installed *before*
// render (those calls aren't routed through the @shared/storage wrapper).

function setConfig(overrides: Record<string, unknown> = {}) {
  return storage.local.update("config", { onboardingDone: true, ...overrides })
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
})
