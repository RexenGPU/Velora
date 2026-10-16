import { describe, expect, it } from 'vitest'
import { auditParams, isPrivateHost, looksLikeUrl, normalizeUrl, normalizeUrlToString } from '@/lib/url'

describe('normalizeUrl', () => {
  it('adds https:// when no scheme is given', () => {
    const r = normalizeUrl('example.com')
    expect(r).not.toBeNull()
    expect(r!.url.toString()).toBe('https://example.com/')
    expect(r!.assumedScheme).toBe(true)
  })

  it('keeps an explicit scheme', () => {
    const r = normalizeUrl('http://example.com')
    expect(r!.url.protocol).toBe('http:')
    expect(r!.assumedScheme).toBe(false)
  })

  it('treats host:port input as a host, not a scheme', () => {
    expect(normalizeUrl('localhost:3000')?.url.toString()).toBe('https://localhost:3000/')
    expect(normalizeUrl('example.com:8080')?.url.toString()).toBe('https://example.com:8080/')
  })

  it('rejects non-web schemes', () => {
    expect(normalizeUrl('javascript:alert(1)')).toBeNull()
    expect(normalizeUrl('data:text/html,hi')).toBeNull()
    expect(normalizeUrl('mailto:a@b.com')).toBeNull()
  })

  it('rejects empty and garbage input', () => {
    expect(normalizeUrl('')).toBeNull()
    expect(normalizeUrl('   ')).toBeNull()
    expect(normalizeUrl('not a url')).toBeNull()
    expect(normalizeUrl('example')).toBeNull()
  })

  it('accepts localhost and IP literals', () => {
    expect(normalizeUrlToString('localhost')).toBe('https://localhost/')
    expect(normalizeUrlToString('http://192.168.1.1:8000/x')).toBe('http://192.168.1.1:8000/x')
  })
})

describe('auditParams', () => {
  it('detects and removes tracking parameters', () => {
    const url = new URL('https://example.com/?utm_source=news&page=2&fbclid=abc')
    const audit = auditParams(url)
    expect(audit.tracking.map((t) => t.name).sort()).toEqual(['fbclid', 'utm_source'])
    expect(audit.cleanedUrl?.toString()).toBe('https://example.com/?page=2')
  })

  it('detects gclid and utm_* prefixes', () => {
    const url = new URL('https://shop.example/?gclid=x&utm_campaign=spring&id=5')
    const audit = auditParams(url)
    expect(audit.tracking.map((t) => t.name).sort()).toEqual(['gclid', 'utm_campaign'])
    expect(audit.cleanedUrl?.toString()).toBe('https://shop.example/?id=5')
  })

  it('returns no cleaned url when nothing to strip', () => {
    const audit = auditParams(new URL('https://example.com/?q=1'))
    expect(audit.tracking).toEqual([])
    expect(audit.cleanedUrl).toBeNull()
  })
})

describe('looksLikeUrl', () => {
  it('detects web addresses', () => {
    expect(looksLikeUrl('https://example.com')).toBe(true)
    expect(looksLikeUrl('example.com')).toBe(true)
    expect(looksLikeUrl('news.ycombinator.com/item?id=1')).toBe(true)
    expect(looksLikeUrl('localhost:3000/app')).toBe(true)
    expect(looksLikeUrl('192.168.1.10:8080')).toBe(true)
  })

  it('treats queries as searches', () => {
    expect(looksLikeUrl('hello world')).toBe(false)
    expect(looksLikeUrl('3.14')).toBe(false)
    expect(looksLikeUrl('chrome')).toBe(false)
    expect(looksLikeUrl('')).toBe(false)
    expect(looksLikeUrl('foo/bar')).toBe(false)
  })
})

describe('isPrivateHost', () => {
  it('recognizes private ranges', () => {
    expect(isPrivateHost('localhost')).toBe(true)
    expect(isPrivateHost('192.168.1.10')).toBe(true)
    expect(isPrivateHost('10.0.0.5')).toBe(true)
    expect(isPrivateHost('172.16.0.1')).toBe(true)
    expect(isPrivateHost('169.254.1.1')).toBe(true)
    expect(isPrivateHost('[::1]')).toBe(true)
    expect(isPrivateHost('example.com')).toBe(false)
  })
})
