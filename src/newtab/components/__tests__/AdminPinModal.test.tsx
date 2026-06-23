import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { hashPin } from "@shared/pin"
import { storage } from "@shared/storage"
import { AdminPinModal } from "../AdminPinModal"

// AdminPinModal talks only to @shared/storage (never raw chrome.storage), and
// that module captures its backing store once at import time. With no chrome
// global installed it falls back to an in-memory Map, which we reset by hand
// instead of via a chrome mock — see storage.test.ts for the same pattern.

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function setPin(pin: string) {
  const { pinHash, pinSalt } = await hashPin(pin)
  await storage.local.update("config", { pinHash, pinSalt })
}

async function clickDigits(digits: string) {
  for (const d of digits) {
    // eslint-disable-next-line no-await-in-loop
    fireEvent.click(screen.getByRole("button", { name: d }))
  }
}

describe("AdminPinModal", () => {
  let onSuccess: ReturnType<typeof vi.fn<() => void>>
  let onCancel: ReturnType<typeof vi.fn<() => void>>

  beforeEach(async () => {
    await storage.local.clear()
    await storage.session.clear()
    onSuccess = vi.fn<() => void>()
    onCancel = vi.fn<() => void>()
  })

  it("renders the PIN dialog with an empty 4-dot indicator", async () => {
    render(<AdminPinModal onSuccess={onSuccess} onCancel={onCancel} />)
    expect(await screen.findByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText("Caregiver access")).toBeInTheDocument()
  })

  it("calls onSuccess and clears any lockout state when the correct PIN is entered", async () => {
    await setPin("4321")
    await storage.local.set("pinLockout", { failCount: 3, lockedUntil: null })
    const user = userEvent.setup()
    render(<AdminPinModal onSuccess={onSuccess} onCancel={onCancel} />)
    await screen.findByRole("dialog")

    for (const d of "4321") await user.click(screen.getByRole("button", { name: d }))

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
    const lockout = await storage.local.get("pinLockout")
    expect(lockout).toEqual({ failCount: 0, lockedUntil: null })
  })

  it("shows an error and increments the fail count on a wrong PIN", async () => {
    await setPin("4321")
    render(<AdminPinModal onSuccess={onSuccess} onCancel={onCancel} />)
    await screen.findByRole("dialog")

    await clickDigits("0000")

    await waitFor(() =>
      expect(screen.getByText("Incorrect PIN (4 left)")).toBeInTheDocument(),
    )
    expect(onSuccess).not.toHaveBeenCalled()

    const lockout = await storage.local.get("pinLockout")
    expect(lockout.failCount).toBe(1)
    expect(lockout.lockedUntil).toBeNull()

    // The recovery hint only appears after a wrong attempt.
    expect(
      screen.getByText(/Forgot your PIN\? There's no master override/),
    ).toBeInTheDocument()
  })

  it("locks out the numpad after 5 wrong attempts and persists the lockout", async () => {
    await setPin("4321")
    render(<AdminPinModal onSuccess={onSuccess} onCancel={onCancel} />)
    await screen.findByRole("dialog")

    for (let i = 0; i < 5; i++) {
      // eslint-disable-next-line no-await-in-loop
      await clickDigits("0000")
      // Confirm verify() actually finished (storage updated) before relying
      // on timing for the rest — PBKDF2 + storage latency is variable.
      // eslint-disable-next-line no-await-in-loop
      await waitFor(async () => {
        const lockout = await storage.local.get("pinLockout")
        expect(lockout.failCount).toBe(i + 1)
      })
      // The wrong-PIN shake/error clears (and the numpad resets) 900ms later
      // via a real setTimeout in triggerError — wait it out so the next
      // round's clicks land on a fresh, empty input.
      // eslint-disable-next-line no-await-in-loop
      await sleep(1000)
    }

    await waitFor(() => expect(screen.getByText("seconds remaining")).toBeInTheDocument())
    const lockout = await storage.local.get("pinLockout")
    expect(lockout.failCount).toBe(5)
    expect(lockout.lockedUntil).not.toBeNull()

    // Numpad is replaced by the countdown while locked.
    expect(screen.queryByRole("button", { name: "1" })).not.toBeInTheDocument()
  }, 15000)

  it("rejects PIN entry while locked even via keyboard", async () => {
    const lockedUntil = Date.now() + 30_000
    await setPin("4321")
    await storage.local.set("pinLockout", { failCount: 5, lockedUntil })
    render(<AdminPinModal onSuccess={onSuccess} onCancel={onCancel} />)
    await screen.findByRole("dialog")
    await waitFor(() => expect(screen.getByText("seconds remaining")).toBeInTheDocument())

    fireEvent.keyDown(window, { key: "4" })
    fireEvent.keyDown(window, { key: "3" })
    fireEvent.keyDown(window, { key: "2" })
    fireEvent.keyDown(window, { key: "1" })

    expect(onSuccess).not.toHaveBeenCalled()
  })

  it("shows a setup-incomplete error when no PIN has been configured yet", async () => {
    render(<AdminPinModal onSuccess={onSuccess} onCancel={onCancel} />)
    await screen.findByRole("dialog")

    await clickDigits("1234")

    await waitFor(() =>
      expect(
        screen.getByText("No PIN has been set yet — finish setup first"),
      ).toBeInTheDocument(),
    )
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it("calls onCancel when Escape is pressed", async () => {
    render(<AdminPinModal onSuccess={onSuccess} onCancel={onCancel} />)
    await screen.findByRole("dialog")

    fireEvent.keyDown(window, { key: "Escape" })

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it("calls onCancel when clicking the backdrop", async () => {
    render(<AdminPinModal onSuccess={onSuccess} onCancel={onCancel} />)
    const dialog = await screen.findByRole("dialog")
    const backdrop = dialog.parentElement!

    fireEvent.mouseDown(backdrop)

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it("calls onCancel when the Cancel button is clicked", async () => {
    const user = userEvent.setup()
    render(<AdminPinModal onSuccess={onSuccess} onCancel={onCancel} />)
    await screen.findByRole("dialog")

    await user.click(screen.getByRole("button", { name: "Cancel" }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
