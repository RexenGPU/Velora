import type { TrackerCategory, TrackerEntry, TrackerMatch } from '@/types'

/**
 * Curated reference list of well-known tracking domains.
 *
 * This is a transparent, maintainable subset informed by public knowledge
 * (vendor documentation, Disconnect-style lists, EasyPrivacy). It is NOT a
 * complete blocklist, and Velora never blocks anything — it only matches
 * URLs you type into the inspector. To extend the list, edit this file.
 */
export const TRACKERS: TrackerEntry[] = [
  // --- Advertising ---
  { domain: 'doubleclick.net', operator: 'Google', category: 'advertising', note: "Google's display-advertising platform." },
  { domain: 'googleadservices.com', operator: 'Google', category: 'advertising', note: 'Ad click and conversion tracking.' },
  { domain: 'googlesyndication.com', operator: 'Google', category: 'advertising', note: 'AdSense and ad-manager delivery.' },
  { domain: 'adservice.google.com', operator: 'Google', category: 'advertising' },
  { domain: 'ads-twitter.com', operator: 'X (Twitter)', category: 'advertising', note: 'Ad conversion pixel.' },
  { domain: 'amazon-adsystem.com', operator: 'Amazon', category: 'advertising', note: 'Ads and purchase attribution.' },
  { domain: 'criteo.com', operator: 'Criteo', category: 'advertising', note: 'Retargeting network.' },
  { domain: 'criteo.net', operator: 'Criteo', category: 'advertising' },
  { domain: 'taboola.com', operator: 'Taboola', category: 'advertising', note: 'Sponsored content recommendations.' },
  { domain: 'outbrain.com', operator: 'Outbrain', category: 'advertising', note: 'Sponsored content recommendations.' },
  { domain: 'adnxs.com', operator: 'Xandr (Microsoft)', category: 'advertising', note: 'Programmatic ad exchange.' },
  { domain: 'pubmatic.com', operator: 'PubMatic', category: 'advertising', note: 'Ad exchange.' },
  { domain: 'rubiconproject.com', operator: 'Magnite', category: 'advertising', note: 'Ad exchange.' },
  { domain: 'casalemedia.com', operator: 'Index Exchange', category: 'advertising', note: 'Ad exchange.' },
  { domain: 'openx.net', operator: 'OpenX', category: 'advertising', note: 'Ad exchange.' },
  { domain: 'smartadserver.com', operator: 'Equativ', category: 'advertising', note: 'Ad server.' },
  { domain: 'media.net', operator: 'Media.net', category: 'advertising', note: 'Contextual advertising.' },
  { domain: 'adform.net', operator: 'Adform', category: 'advertising', note: 'Ad tracking platform.' },

  // --- Analytics ---
  { domain: 'google-analytics.com', operator: 'Google', category: 'analytics', note: 'Google Analytics measurement.' },
  { domain: 'googletagmanager.com', operator: 'Google', category: 'analytics', note: 'Tag container that usually loads further trackers.' },
  { domain: 'app-measurement.com', operator: 'Google', category: 'analytics', note: 'Firebase Analytics.' },
  { domain: 'mc.yandex.ru', operator: 'Yandex', category: 'analytics', note: 'Yandex Metrica, a GA-style tracker.' },
  { domain: 'mixpanel.com', operator: 'Mixpanel', category: 'analytics', note: 'Product analytics.' },
  { domain: 'segment.io', operator: 'Twilio Segment', category: 'analytics', note: 'Customer-data pipe that forwards events to other vendors.' },
  { domain: 'segment.com', operator: 'Twilio Segment', category: 'analytics' },
  { domain: 'amplitude.com', operator: 'Amplitude', category: 'analytics', note: 'Product analytics.' },
  { domain: 'heapanalytics.com', operator: 'Heap', category: 'analytics', note: 'Automatic product analytics.' },
  { domain: 'chartbeat.com', operator: 'Chartbeat', category: 'analytics', note: 'Real-time newsroom analytics.' },
  { domain: 'chartbeat.net', operator: 'Chartbeat', category: 'analytics' },
  { domain: 'parsely.com', operator: 'Dash (Parse.ly)', category: 'analytics', note: 'Content analytics.' },
  { domain: 'pendo.io', operator: 'Pendo', category: 'analytics', note: 'In-app product analytics.' },
  { domain: 'scorecardresearch.com', operator: 'Full Circle Media', category: 'analytics', note: 'comScore measurement beacon.' },
  { domain: 'quantserve.com', operator: 'Quantcast', category: 'analytics', note: 'Audience measurement.' },
  { domain: 'matomo.cloud', operator: 'Matomo', category: 'analytics', stance: 'privacy-conscious', note: 'Open-source analytics; self-hostable. The cloud version still sends data to a third party.' },
  { domain: 'plausible.io', operator: 'Plausible', category: 'analytics', stance: 'privacy-conscious', note: 'Cookieless, aggregate analytics; still a third-party request.' },
  { domain: 'cloudflareinsights.com', operator: 'Cloudflare', category: 'analytics', stance: 'privacy-conscious', note: 'Cloudflare Web Analytics; cookieless.' },

  // --- Session replay ---
  { domain: 'hotjar.com', operator: 'Hotjar', category: 'session-replay', note: 'Heatmaps and session recordings.' },
  { domain: 'clarity.ms', operator: 'Microsoft', category: 'session-replay', note: 'Session replay and heatmaps.' },
  { domain: 'fullstory.com', operator: 'FullStory', category: 'session-replay', note: 'Session replay.' },
  { domain: 'logrocket.com', operator: 'LogRocket', category: 'session-replay', note: 'Session replay for developers.' },
  { domain: 'mouseflow.com', operator: 'Mouseflow', category: 'session-replay' },
  { domain: 'luckyorange.com', operator: 'Lucky Orange', category: 'session-replay' },
  { domain: 'quantummetric.com', operator: 'Quantum Metric', category: 'session-replay' },
  { domain: 'crazyegg.com', operator: 'Crazy Egg', category: 'session-replay', note: 'Heatmaps and recordings.' },
  { domain: 'inspectlet.com', operator: 'Inspectlet', category: 'session-replay' },

  // --- Social widgets ---
  { domain: 'facebook.net', operator: 'Meta', category: 'social', note: 'SDK and pixel infrastructure (connect.facebook.net).' },
  { domain: 'platform.twitter.com', operator: 'X (Twitter)', category: 'social', note: 'Embedded timelines and widgets.' },
  { domain: 't.co', operator: 'X (Twitter)', category: 'social', note: 'Link shortener used to measure outbound clicks.' },
  { domain: 'licdn.com', operator: 'LinkedIn', category: 'social', note: "CDN hosting LinkedIn's pixel and SDK scripts." },
  { domain: 'ct.pinterest.com', operator: 'Pinterest', category: 'social', note: 'Conversion tag endpoint.' },
  { domain: 'ads.linkedin.com', operator: 'LinkedIn', category: 'social', note: 'Ad conversion pixel.' },
  { domain: 'platform.instagram.com', operator: 'Meta', category: 'social', note: 'Embed endpoints.' },

  // --- Attribution ---
  { domain: 'branch.io', operator: 'Branch', category: 'attribution', note: 'Attribution and deep links.' },
  { domain: 'appsflyer.com', operator: 'AppsFlyer', category: 'attribution', note: 'Mobile attribution.' },
  { domain: 'adjust.com', operator: 'Adjust', category: 'attribution', note: 'Mobile attribution.' },
  { domain: 'kochava.com', operator: 'Kochava', category: 'attribution', note: 'Mobile attribution.' },
  { domain: 'singular.net', operator: 'Singular', category: 'attribution', note: 'Mobile attribution.' },

  // --- Fingerprinting ---
  { domain: 'fingerprintjs.com', operator: 'FingerprintJS', category: 'fingerprinting', note: 'Open-source device fingerprinting library.' },
  { domain: 'fingerprint.com', operator: 'FingerprintJS Pro', category: 'fingerprinting', note: 'Commercial device identification.' },
  { domain: 'deviceatlas.com', operator: 'DeviceAtlas', category: 'fingerprinting', note: 'Device detection.' },
  { domain: 'iovation.com', operator: 'iovation', category: 'fingerprinting', note: 'Device reputation and fraud scoring.' },

  // --- Error / performance monitoring ---
  { domain: 'sentry.io', operator: 'Sentry', category: 'monitoring', note: 'Crash reporting — not ad tracking, but still a third party receiving data.' },
  { domain: 'sentry-cdn.com', operator: 'Sentry', category: 'monitoring' },
  { domain: 'nr-data.net', operator: 'New Relic', category: 'monitoring' },
  { domain: 'newrelic.com', operator: 'New Relic', category: 'monitoring' },
  { domain: 'datadoghq.com', operator: 'Datadog', category: 'monitoring' },
  { domain: 'bugsnag.com', operator: 'Bugsnag', category: 'monitoring' },
  { domain: 'rollbar.com', operator: 'Rollbar', category: 'monitoring' },
]

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
