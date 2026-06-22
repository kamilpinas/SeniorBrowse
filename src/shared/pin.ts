// PIN hashing — the caregiver's PIN must never be stored or compared in
// plaintext (previously `config.adminPin` held the raw 4-digit string and
// defaulted to the publicly-documented "1234"). Uses PBKDF2-SHA256 via the
// Web Crypto API, which is available in every extension context (service
// worker, newtab, admin) with no extra dependency.

const PBKDF2_ITERATIONS = 100_000
const HASH_BITS = 256

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return out
}

async function deriveHash(pin: string, salt: Uint8Array): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt.slice().buffer,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    HASH_BITS,
  )
  return toHex(new Uint8Array(bits))
}

/** Generates a fresh random salt and hash for a newly chosen PIN. */
export async function hashPin(
  pin: string,
): Promise<{ pinHash: string; pinSalt: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const pinHash = await deriveHash(pin, salt)
  return { pinHash, pinSalt: toHex(salt) }
}

/** Verifies an entered PIN against the stored hash + salt. */
export async function verifyPin(
  pin: string,
  pinHash: string,
  pinSalt: string,
): Promise<boolean> {
  if (!pinHash || !pinSalt) return false
  const candidate = await deriveHash(pin, fromHex(pinSalt))
  return timingSafeEqual(candidate, pinHash)
}

// Constant-time string comparison — avoids leaking match length via timing.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
