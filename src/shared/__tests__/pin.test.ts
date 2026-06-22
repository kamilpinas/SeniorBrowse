import { describe, it, expect } from "vitest"
import { hashPin, verifyPin } from "../pin"

describe("hashPin", () => {
  it("returns a hash and salt as hex strings", async () => {
    const { pinHash, pinSalt } = await hashPin("1234")
    expect(pinHash).toMatch(/^[0-9a-f]+$/)
    expect(pinSalt).toMatch(/^[0-9a-f]+$/)
  })

  it("produces a 32-bit-friendly 64-char hash (SHA-256 -> 32 bytes hex)", async () => {
    const { pinHash } = await hashPin("1234")
    expect(pinHash).toHaveLength(64)
  })

  it("produces a 16-byte salt (32 hex chars)", async () => {
    const { pinSalt } = await hashPin("1234")
    expect(pinSalt).toHaveLength(32)
  })

  it("generates a different salt on every call", async () => {
    const a = await hashPin("1234")
    const b = await hashPin("1234")
    expect(a.pinSalt).not.toBe(b.pinSalt)
  })

  it("produces a different hash for the same PIN due to random salt", async () => {
    const a = await hashPin("1234")
    const b = await hashPin("1234")
    expect(a.pinHash).not.toBe(b.pinHash)
  })

  it("never stores the raw PIN value anywhere in its output", async () => {
    const { pinHash, pinSalt } = await hashPin("1234")
    expect(pinHash).not.toContain("1234")
    expect(pinSalt).not.toContain("1234")
  })

  it("produces different hashes for different PINs", async () => {
    const a = await hashPin("1234")
    const b = await hashPin("5678")
    expect(a.pinHash).not.toBe(b.pinHash)
  })
})

describe("verifyPin", () => {
  it("returns true for the correct PIN", async () => {
    const { pinHash, pinSalt } = await hashPin("1234")
    await expect(verifyPin("1234", pinHash, pinSalt)).resolves.toBe(true)
  })

  it("returns false for an incorrect PIN", async () => {
    const { pinHash, pinSalt } = await hashPin("1234")
    await expect(verifyPin("0000", pinHash, pinSalt)).resolves.toBe(false)
  })

  it("returns false when pinHash is empty (PIN never set)", async () => {
    await expect(verifyPin("1234", "", "somesalt")).resolves.toBe(false)
  })

  it("returns false when pinSalt is empty", async () => {
    const { pinHash } = await hashPin("1234")
    await expect(verifyPin("1234", pinHash, "")).resolves.toBe(false)
  })

  it("returns false when both hash and salt are empty", async () => {
    await expect(verifyPin("1234", "", "")).resolves.toBe(false)
  })

  it("is case/format sensitive — a PIN with extra whitespace does not match", async () => {
    const { pinHash, pinSalt } = await hashPin("1234")
    await expect(verifyPin(" 1234", pinHash, pinSalt)).resolves.toBe(false)
    await expect(verifyPin("1234 ", pinHash, pinSalt)).resolves.toBe(false)
  })

  it("rejects a candidate verified against the wrong salt", async () => {
    const a = await hashPin("1234")
    const b = await hashPin("1234")
    // Same PIN, but cross-matching hash from one with salt from the other
    // must fail since the derived hash depends on both.
    await expect(verifyPin("1234", a.pinHash, b.pinSalt)).resolves.toBe(false)
  })

  it("supports PINs longer than 4 digits without throwing", async () => {
    const { pinHash, pinSalt } = await hashPin("123456")
    await expect(verifyPin("123456", pinHash, pinSalt)).resolves.toBe(true)
    await expect(verifyPin("1234", pinHash, pinSalt)).resolves.toBe(false)
  })

  it("round-trips correctly across many random PINs", async () => {
    for (const pin of ["0000", "9999", "4242", "1111", "8520"]) {
      const { pinHash, pinSalt } = await hashPin(pin)
      await expect(verifyPin(pin, pinHash, pinSalt)).resolves.toBe(true)
    }
  })
})
