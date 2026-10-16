import { describe, expect, it } from 'vitest'
import { parseBackup, sanitizeSettings } from '@/lib/export'
import { sanitizeFavorite, sanitizeFavorites } from '@/lib/favorites'
import type { Favorite } from '@/types'

const validBackup = JSON.stringify({
  version: 1,
  exportedAt: '2026-01-01T00:00:00.000Z',
  favorites: [
    { id: 'a', name: 'Example', url: 'https://example.com' },
    { id: 'b', name: 'Local', url: 'http://localhost:3000' },
  ],
  settings: { theme: 'light', accent: 'green' },
  checklist: { 'block-3p-cookies': true },
})

describe('parseBackup', () => {
  it('accepts a valid backup', () => {
    const r = parseBackup(validBackup)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data.favorites).toHaveLength(2)
      expect(r.data.settings?.theme).toBe('light')
      expect(r.data.checklist?.['block-3p-cookies']).toBe(true)
    }
  })

  it('normalizes URLs in favorites', () => {
    const r = parseBackup(JSON.stringify({ favorites: [{ name: 'X', url: 'example.com' }] }))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data.favorites[0].url).toBe('https://example.com/')
    }
  })

  it('rejects invalid JSON', () => {
    const r = parseBackup('{not json')
    expect(r.ok).toBe(false)
  })

  it('rejects non-object payloads', () => {
    expect(parseBackup('[1,2,3]').ok).toBe(false)
    expect(parseBackup('null').ok).toBe(false)
  })

  it('rejects empty backups', () => {
    const r = parseBackup(JSON.stringify({ favorites: [], settings: null }))
    expect(r.ok).toBe(false)
  })

  it('skips invalid favorites but keeps valid ones', () => {
    const r = parseBackup(
      JSON.stringify({
        favorites: [
          { name: 'Good', url: 'https://good.example' },
          { name: '', url: 'https://noname.example' },
          { name: 'Bad', url: 'javascript:alert(1)' },
          'garbage',
        ],
      }),
    )
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data.favorites).toHaveLength(1)
      expect(r.data.skipped).toBe(3)
    }
  })
})

describe('sanitizeFavorite', () => {
  it('regenerates invalid ids', () => {
    const fav = sanitizeFavorite({ id: 'bad id!', name: 'X', url: 'https://x.example' })
    expect(fav?.id).toMatch(/^[\w-]+$/)
  })

  it('trims and caps fields', () => {
    const fav = sanitizeFavorite({
      name: '  A very long name  ',
      url: 'https://x.example',
      icon: '🙂',
      category: 'News',
    })
    expect(fav?.name).toBe('A very long name')
    expect(fav?.icon).toBe('🙂')
    expect(fav?.category).toBe('News')
  })

  it('drops icon and category when absent', () => {
    const fav = sanitizeFavorite({ name: 'X', url: 'https://x.example' })
    expect(fav).not.toHaveProperty('icon')
    expect(fav).not.toHaveProperty('category')
  })
})

describe('sanitizeFavorites', () => {
  it('enforces the maximum', () => {
    const many = Array.from({ length: 250 }, (_, i) => ({
      name: `F${i}`,
      url: `https://f${i}.example`,
    }))
    const { favorites, skipped } = sanitizeFavorites(many)
    expect(favorites.length).toBe(200)
    expect(skipped).toBe(50)
  })
})

describe('sanitizeSettings', () => {
  it('picks only valid keys', () => {
    const patch = sanitizeSettings({
      theme: 'neon',
      accent: 'green',
      layout: 'spacious',
      engine: 'mojeek',
      searchInNewTab: 'yes',
      clock: { visible: false, format: '12h' },
    })
    expect(patch?.accent).toBe('green')
    expect(patch?.engine).toBe('mojeek')
    expect(patch?.clock).toEqual({ visible: false, format: '12h' })
    expect(patch).not.toHaveProperty('theme')
    expect(patch).not.toHaveProperty('layout')
    expect(patch).not.toHaveProperty('searchInNewTab')
  })

  it('accepts the custom engine and a normalized startup URL', () => {
    const patch = sanitizeSettings({
      engine: 'custom',
      customEngine: { name: 'Kagi', urlTemplate: 'https://kagi.com/search?q=%s' },
      startupUrl: 'example.com/start',
    })
    expect(patch?.engine).toBe('custom')
    expect(patch?.customEngine).toEqual({ name: 'Kagi', urlTemplate: 'https://kagi.com/search?q=%s' })
    expect(patch?.startupUrl).toBe('https://example.com/start')
  })

  it('drops invalid custom engines and startup URLs', () => {
    const patch = sanitizeSettings({
      engine: 'custom',
      customEngine: { name: 'X', urlTemplate: 'missing-placeholder' },
      startupUrl: 'javascript:alert(1)',
    })
    expect(patch).not.toHaveProperty('customEngine')
    expect(patch).not.toHaveProperty('startupUrl')
  })

  it('returns null for garbage', () => {
    expect(sanitizeSettings(null)).toBeNull()
    expect(sanitizeSettings('x')).toBeNull()
    expect(sanitizeSettings({})).toBeNull()
  })
})

describe('Favorite type round-trip', () => {
  it('keeps required fields and normalizes the url', () => {
    const fav: Favorite = { id: 'x', name: 'X', url: 'https://x.example' }
    expect(sanitizeFavorite(fav)).toEqual({ ...fav, url: 'https://x.example/' })
  })
})
