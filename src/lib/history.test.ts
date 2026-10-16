import { describe, expect, it } from 'vitest'
import { dayLabel, sanitizeHistory, sanitizeHistoryEntry } from '@/lib/history'

describe('sanitizeHistoryEntry', () => {
  it('accepts a valid entry', () => {
    const entry = sanitizeHistoryEntry({
      id: 'abc',
      kind: 'search',
      title: 'privacy tools',
      url: 'https://duckduckgo.com/?q=privacy+tools',
      at: 1_700_000_000_000,
    })
    expect(entry).toMatchObject({ id: 'abc', kind: 'search', title: 'privacy tools' })
  })

  it('normalizes missing ids and caps titles', () => {
    const entry = sanitizeHistoryEntry({
      kind: 'shortcut',
      title: 'x'.repeat(300),
      url: 'https://example.com/',
      at: 123,
    })
    expect(entry).not.toBeNull()
    expect(entry!.id).toMatch(/^[\w-]+$/)
    expect(entry!.title.length).toBeLessThanOrEqual(120)
  })

  it('rejects garbage and non-web URLs', () => {
    expect(sanitizeHistoryEntry(null)).toBeNull()
    expect(sanitizeHistoryEntry({ title: 'x', url: 'javascript:alert(1)' })).toBeNull()
    expect(sanitizeHistoryEntry({ title: '', url: 'https://example.com/' })).toBeNull()
    expect(sanitizeHistoryEntry({ title: 'ok', url: 'not-a-url' })).toBeNull()
  })
})

describe('sanitizeHistory', () => {
  it('keeps only valid entries and caps the list', () => {
    const many = Array.from({ length: 600 }, (_, i) => ({
      title: `T${i}`,
      url: `https://t${i}.example/`,
      kind: 'shortcut',
      at: 1,
    }))
    const result = sanitizeHistory(many)
    expect(result.length).toBe(500)
    expect(result[0].title).toBe('T0')
  })
})

describe('dayLabel', () => {
  const DAY = 86_400_000
  it('labels today and yesterday', () => {
    const now = Date.now()
    expect(dayLabel(now, now)).toBe('Today')
    expect(dayLabel(now - DAY, now)).toBe('Yesterday')
  })
})
