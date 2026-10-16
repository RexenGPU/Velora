import type { TrackerMatch } from '@/types'
import { auditParams, hasPunycode, isIpHost, isPrivateHost, normalizeUrl, type ParamAudit } from '@/lib/url'
import { CATEGORY_META, matchTrackers } from '@/lib/trackers'

export type InsightLevel = 'secure' | 'info' | 'warn' | 'alert' | 'none'

export interface Observation {
  id: string
  level: InsightLevel
  title: string
  detail: string
}

export interface Inspection {
  input: string
  url: string
  host: string
  assumedScheme: boolean
  status: InsightLevel
  headline: string
  trackerMatches: TrackerMatch[]
  paramAudit: ParamAudit
  observations: Observation[]
}

/**
 * Analyze a URL using only the URL text itself.
 * Velora makes no network request to the target — everything here is derived
 * from the address string, so results are honest about what is and isn't known.
 */
export function inspectUrl(raw: string): Inspection | null {
  const norm = normalizeUrl(raw)
  if (!norm) return null

  const { url, assumedScheme } = norm
  const host = url.hostname.toLowerCase()
  const https = url.protocol === 'https:'
  const trackerMatches = matchTrackers(host)
  const paramAudit = auditParams(url)

  const observations: Observation[] = []

  if (https) {
    observations.push({
      id: 'scheme',
      level: 'secure',
      title: 'Encrypted connection (HTTPS)',
      detail:
        'Traffic between you and this site is encrypted in transit. HTTPS does not mean the site is trustworthy — only that the connection is.',
    })
  } else {
    observations.push({
      id: 'scheme',
      level: 'alert',
      title: 'Unencrypted connection (HTTP)',
      detail:
        'Requests and responses travel in plain text. Networks along the way (Wi-Fi, ISP) can read and modify them.',
    })
  }

  if (assumedScheme) {
    observations.push({
      id: 'assumed',
      level: 'info',
      title: 'Scheme assumed',
      detail:
        'No protocol was given, so Velora assumed https://. If the site actually serves http://, the connection would not be encrypted.',
    })
  }

  for (const m of trackerMatches) {
    const meta = CATEGORY_META[m.entry.category]
    const stance =
      m.entry.stance === 'privacy-conscious'
        ? ' This operator positions the product as privacy-conscious, but it is still a third-party request.'
        : ''
    const note = m.entry.note ? ` ${m.entry.note}` : ''
    observations.push({
      id: `tracker-${m.entry.domain}`,
      level: 'alert',
      title: `Known ${meta.label.toLowerCase()} domain: ${m.entry.domain}`,
      detail: `Operated by ${m.entry.operator}.${note}${stance}`,
    })
  }

  if (paramAudit.tracking.length) {
    observations.push({
      id: 'params',
      level: 'warn',
      title: `Tracking parameters (${paramAudit.tracking.length})`,
      detail: `Found: ${paramAudit.tracking.map((t) => t.name).join(', ')}. These let the destination attribute your visit to a campaign or referrer. A cleaned URL is available below.`,
    })
  }

  if (isIpHost(host)) {
    observations.push({
      id: 'ip',
      level: 'info',
      title: 'Raw IP address',
      detail:
        'The host is an IP address rather than a domain name. Common for internal tools and some servers; certificates are rarely issued for bare IPs.',
    })
  }

  if (isPrivateHost(host)) {
    observations.push({
      id: 'private',
      level: 'info',
      title: 'Local or private address',
      detail: 'This address points to your own device or network, not the public internet.',
    })
  }

  if (hasPunycode(host)) {
    observations.push({
      id: 'punycode',
      level: 'warn',
      title: 'Internationalized domain (punycode)',
      detail:
        'The hostname contains non-ASCII characters encoded as xn--. Look-alike characters can be used for spoofing — verify the address matches what you expect.',
    })
  }

  if (url.port && url.port !== '80' && url.port !== '443') {
    observations.push({
      id: 'port',
      level: 'info',
      title: 'Non-standard port',
      detail: `The URL specifies port ${url.port}.`,
    })
  }

  if (!trackerMatches.length) {
    observations.push({
      id: 'no-tracker',
      level: 'none',
      title: "Not on Velora's known tracker list",
      detail:
        "This host doesn't match Velora's tracker reference list. That is a limited, curated list — absence does not mean the site is safe or tracker-free.",
    })
  }

  observations.push({
    id: 'limits',
    level: 'info',
    title: 'Insufficient information for deeper checks',
    detail:
      'A web page cannot see this site\'s cookies, network requests, or scripts. Additional checks require a browser extension (planned — see Privacy tools).',
  })

  let status: InsightLevel = 'secure'
  let headline = 'Secure connection detected'
  if (!https) {
    status = 'alert'
    headline = 'Unencrypted connection detected'
  } else if (trackerMatches.length) {
    status = 'alert'
    headline = 'Potential tracking domain detected'
  }

  return {
    input: raw,
    url: url.toString(),
    host,
    assumedScheme,
    status,
    headline,
    trackerMatches,
    paramAudit,
    observations,
  }
}
