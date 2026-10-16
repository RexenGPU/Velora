import { describe, expect, it } from 'vitest'
import { decryptJson, deriveKey, encryptJson, generatePassword, fromB64, toB64 } from '@/lib/crypto'

describe('crypto helpers', () => {
  it('round-trips JSON through AES-GCM', async () => {
    const key = await deriveKey('correct horse battery staple', fromB64(toB64(new Uint8Array(16))), 50_000)
    const { iv, data } = await encryptJson(key, { name: 'Example', password: 'hunter2' })
    const back = await decryptJson<{ name: string; password: string }>(key, iv, data)
    expect(back).toEqual({ name: 'Example', password: 'hunter2' })
  })

  it('rejects the wrong master password', async () => {
    const salt = new Uint8Array(16)
    const goodKey = await deriveKey('right-password', salt, 50_000)
    const badKey = await deriveKey('wrong-password', salt, 50_000)
    const { iv, data } = await encryptJson(goodKey, { secret: 'value' })
    await expect(decryptJson(badKey, iv, data)).rejects.toThrow()
  })

  it('derives the same key for the same password and salt', async () => {
    const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])
    const a = await deriveKey('pw', salt, 50_000)
    const b = await deriveKey('pw', salt, 50_000)
    const payload = 'match-me'
    const enc = await encryptJson(a, payload)
    const dec = await decryptJson<string>(b, enc.iv, enc.data)
    expect(dec).toBe('match-me')
  })

  it('produces a fresh IV every time', async () => {
    const key = await deriveKey('pw', new Uint8Array(16), 50_000)
    const a = await encryptJson(key, 'x')
    const b = await encryptJson(key, 'x')
    expect(a.iv).not.toBe(b.iv)
  })
})

describe('generatePassword', () => {
  it('generates the requested length from the right alphabet', () => {
    const alphabet = new Set('ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+')
    for (let i = 0; i < 20; i++) {
      const pw = generatePassword(24)
      expect(pw.length).toBe(24)
      for (const c of pw) expect(alphabet.has(c)).toBe(true)
    }
  })

  it('does not generate identical consecutive passwords', () => {
    const a = generatePassword(20)
    const b = generatePassword(20)
    expect(a).not.toBe(b)
  })
})
