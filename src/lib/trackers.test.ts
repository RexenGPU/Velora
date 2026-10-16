import { describe, expect, it } from 'vitest'
import { CATEGORY_META, TRACKERS, matchTrackers } from '@/lib/trackers'

describe('matchTrackers', () => {
  it('matches exact domains', () => {
    const m = matchTrackers('doubleclick.net')
    expect(m).toHaveLength(1)
    expect(m[0].entry.operator).toBe('Google')
  })

  it('matches subdomains', () => {
    const m = matchTrackers('connect.facebook.net')
    expect(m.some((x) => x.entry.domain === 'facebook.net')).toBe(true)
  })

  it('does not match look-alike domains', () => {
    expect(matchTrackers('notdoubleclick.net')).toHaveLength(0)
    expect(matchTrackers('evilgoogle-analytics.com')).toHaveLength(0)
    expect(matchTrackers('google-analytics.com.evil.io')).toHaveLength(0)
  })

  it('does not flag the public site itself for social platforms', () => {
    expect(matchTrackers('facebook.com')).toHaveLength(0)
    expect(matchTrackers('twitter.com')).toHaveLength(0)
  })

  it('flags privacy-conscious operators with a stance', () => {
    const m = matchTrackers('plausible.io')
    expect(m[0].entry.stance).toBe('privacy-conscious')
  })

  it('has metadata for every category', () => {
    const categories = new Set(TRACKERS.map((x) => x.category))
    for (const c of categories) {
      expect(CATEGORY_META[c]).toBeDefined()
    }
  })
})
