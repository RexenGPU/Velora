import type { TrackerCategory, TrackerEntry, TrackerMatch } from '@/types'
import trackerData from '../../shared/trackers.json'

/**
 * Curated reference list of well-known tracking domains.
 *
 * Single source of truth: `shared/trackers.json` — consumed by the inspector
 * (renderer) AND by the desktop app's opt-in request blocking (main process).
 * It is a transparent, maintainable subset informed by public knowledge
 * (vendor documentation, Disconnect-style lists, EasyPrivacy) and is NOT a
 * complete blocklist. To extend it, edit shared/trackers.json.
 */
export const TRACKERS = trackerData as TrackerEntry[]

export const CATEGORY_META: Record<TrackerCategory, { label: string; blurb: string }> = {
  advertising: { label: 'Advertising', blurb: 'Ad delivery, exchanges and retargeting networks.' },
  analytics: { label: 'Analytics', blurb: 'Usage measurement and product analytics services.' },
  'session-replay': { label: 'Session replay', blurb: 'Recordings of on-page behaviour, heatmaps and input capture.' },
  social: { label: 'Social widgets', blurb: 'Third-party social SDKs, pixels and embeds.' },
  attribution: { label: 'Attribution', blurb: 'Ad-network attribution and install measurement.' },
  fingerprinting: { label: 'Fingerprinting', blurb: 'Device fingerprinting and bot-detection scripts.' },
  monitoring: { label: 'Error monitoring', blurb: 'Crash and performance reporting — not ad tracking, but still a third party receiving data.' },
}

export const TRACKER_CATEGORIES = Object.keys(CATEGORY_META) as TrackerCategory[]

/** Match a hostname against the reference list (exact or subdomain). */
export function matchTrackers(host: string): TrackerMatch[] {
  const h = host.toLowerCase()
  const matches: TrackerMatch[] = []
  for (const entry of TRACKERS) {
    if (h === entry.domain || h.endsWith('.' + entry.domain)) {
      matches.push({ entry, host: h })
    }
  }
  return matches
}
