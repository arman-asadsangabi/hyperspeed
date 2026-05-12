/**
 * Edge-compatible password hashing using Web Crypto SHA-256 with a salt.
 * Not as strong as bcrypt/argon2, but suitable for API key verification where:
 *   1) Keys are 32 chars of high-entropy randomness (~190 bits).
 *   2) Rate-limited at the route level.
 *   3) Compare-via-constant-time is enforced.
 *
 * We'll swap to scrypt/argon2 when we move to Node runtime + need extra defense.
 */

const SALT_BYTES = 16

function toHex(buf: ArrayBuffer | Uint8Array): string {
  const view = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  return [...view].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2)
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return arr
}

async function hashWithSalt(key: string, salt: Uint8Array): Promise<string> {
  const enc = new TextEncoder()
  const data = new Uint8Array(salt.length + key.length)
  data.set(salt)
  data.set(enc.encode(key), salt.length)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return `${toHex(salt)}:${toHex(digest)}`
}

export async function hashAsync(key: string): Promise<string> {
  const salt = new Uint8Array(SALT_BYTES)
  crypto.getRandomValues(salt)
  return hashWithSalt(key, salt)
}

export async function compareAsync(key: string, stored: string): Promise<boolean> {
  const idx = stored.indexOf(':')
  if (idx === -1) return false
  const saltHex = stored.slice(0, idx)
  const expectedHex = stored.slice(idx + 1)
  const computed = await hashWithSalt(key, fromHex(saltHex))
  const computedHex = computed.slice(computed.indexOf(':') + 1)
  if (computedHex.length !== expectedHex.length) return false
  let diff = 0
  for (let i = 0; i < computedHex.length; i++)
    diff |= computedHex.charCodeAt(i) ^ expectedHex.charCodeAt(i)
  return diff === 0
}
