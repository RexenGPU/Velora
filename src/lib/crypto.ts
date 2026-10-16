/**
 * Client-side crypto helpers for the local password vault.
 *
 * - Key derivation: PBKDF2 (SHA-256, configurable iterations).
 * - Encryption: AES-GCM 256 (authenticated — wrong keys fail verification).
 * - The master password and derived key never touch storage; the key lives
 *   only in memory while the vault is unlocked.
 */

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export function toB64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

export function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length))
}

export async function deriveKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveKey',
  ])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptJson(
  key: CryptoKey,
  value: unknown,
): Promise<{ iv: string; data: string }> {
  const iv = randomBytes(12)
  const plain = encoder.encode(JSON.stringify(value))
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain)
  return { iv: toB64(iv), data: toB64(new Uint8Array(cipher)) }
}

export async function decryptJson<T>(key: CryptoKey, iv: string, data: string): Promise<T> {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(iv) },
    key,
    fromB64(data),
  )
  return JSON.parse(decoder.decode(plain)) as T
}

/** Cryptographically random password from a 88-character alphabet. */
export function generatePassword(length = 16): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+'
  const bytes = randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length]
  return out
}
