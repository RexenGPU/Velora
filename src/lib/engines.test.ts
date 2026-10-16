import { describe, expect, it } from 'vitest'
import { buildSearchUrl, getEngine, getEngineList, SEARCH_ENGINES, validCustomEngine } from '@/lib/engines'

describe('engines', () => {
  it('builds search URLs with encoded queries', () => {
    const ddg = getEngine('duckduckgo')
    expect(buildSearchUrl(ddg, 'hello world')).toBe('https://duckduckgo.com/?q=hello%20world')
    expect(buildSearchUrl(ddg, 'a&b=c')).toBe('https://duckduckgo.com/?q=a%26b%3Dc')
  })

  it('falls back to DuckDuckGo for unknown ids', () => {
    expect(getEngine('nope').id).toBe('duckduckgo')
  })

  it('has a search URL and policy for every engine', () => {
    for (const e of SEARCH_ENGINES) {
      expect(e.searchUrl).toContain('%s')
      expect(e.policyUrl).toMatch(/^https:\/\//)
    }
  })
})

describe('custom engine', () => {
  const good = { name: 'Kagi', urlTemplate: 'https://kagi.com/search?q=%s' }

  it('accepts a valid template', () => {
    expect(validCustomEngine(good)).toBe(true)
  })

  it('rejects invalid templates', () => {
    expect(validCustomEngine({ name: 'X', urlTemplate: 'https://x.com/search' })).toBe(false)
    expect(validCustomEngine({ name: 'X', urlTemplate: 'ftp://x.com/?q=%s' })).toBe(false)
    expect(validCustomEngine({ name: '  ', urlTemplate: 'https://x.com/?q=%s' })).toBe(false)
    expect(validCustomEngine(null)).toBe(false)
  })

  it('is used when selected and defined', () => {
    const engine = getEngine('custom', good)
    expect(engine.name).toBe('Kagi')
    expect(buildSearchUrl(engine, 'test query')).toBe('https://kagi.com/search?q=test%20query')
  })

  it('falls back when selected but missing or invalid', () => {
    expect(getEngine('custom').id).toBe('duckduckgo')
    expect(getEngine('custom', { name: 'X', urlTemplate: 'no-%s-here' }).id).toBe('duckduckgo')
  })

  it('appears in the engine list only when valid', () => {
    expect(getEngineList(good)).toHaveLength(SEARCH_ENGINES.length + 1)
    expect(getEngineList(undefined)).toHaveLength(SEARCH_ENGINES.length)
    expect(getEngineList({ name: 'X', urlTemplate: 'nope' })).toHaveLength(SEARCH_ENGINES.length)
  })
})
