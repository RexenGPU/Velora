import { describe, expect, it } from 'vitest'
import { inspectUrl } from '@/lib/inspect'

describe('inspectUrl', () => {
  it('returns null for invalid input', () => {
    expect(inspectUrl('')).toBeNull()
    expect(inspectUrl('javascript:alert(1)')).toBeNull()
    expect(inspectUrl('not a url')).toBeNull()
  })

  it('reports a secure connection for plain https URLs', () => {
    const r = inspectUrl('https://example.com')!
    expect(r.status).toBe('secure')
    expect(r.headline).toBe('Secure connection detected')
    expect(r.assumedScheme).toBe(false)
  })

  it('reports unencrypted connections', () => {
    const r = inspectUrl('http://example.com')!
    expect(r.status).toBe('alert')
    expect(r.headline).toBe('Unencrypted connection detected')
  })

  it('flags known tracking domains', () => {
    const r = inspectUrl('https://www.google-analytics.com/collect')!
    expect(r.status).toBe('alert')
    expect(r.headline).toBe('Potential tracking domain detected')
    expect(r.trackerMatches.length).toBeGreaterThan(0)
  })

  it('detects tracking parameters and offers a cleaned URL', () => {
    const r = inspectUrl('https://example.com/?utm_source=news&id=3')!
    expect(r.paramAudit.tracking.map((t) => t.name)).toEqual(['utm_source'])
    expect(r.paramAudit.cleanedUrl?.toString()).toBe('https://example.com/?id=3')
  })

  it('marks assumed schemes as insufficient information', () => {
    const r = inspectUrl('example.com')!
    expect(r.assumedScheme).toBe(true)
    expect(r.url.startsWith('https://')).toBe(true)
  })

  it('flags punycode domains', () => {
    const r = inspectUrl('https://xn--nxasmq6b.example')!
    expect(r.observations.some((o) => o.id === 'punycode')).toBe(true)
  })

  it('always includes the insufficient-information caveat', () => {
    const r = inspectUrl('https://example.com')!
    expect(r.observations.some((o) => o.id === 'limits')).toBe(true)
  })
})
