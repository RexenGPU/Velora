const VALID_SCHEMES = new Set(['http:', 'https:'])

export interface NormalizedUrl {
  url: URL
  assumedScheme: boolean
}

/**
 * Normalize user input into a web URL.
 * - Prepends https:// when no scheme is given (marked as assumed).
 * - Accepts http/https only; rejects javascript:, data:, mailto:, etc.
 * - Accepts bare hosts, localhost, and IP literals.
 */
export function normalizeUrl(input: string): NormalizedUrl | null {
  if (typeof input !== 'string') return null
  const trimmed = input.trim()
  if (!trimmed || trimmed.length > 2048) return null

  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
  // "localhost:3000" or "example.com:8080" would parse as a bogus scheme — treat as host:port.
  const hostPort = /^[\w.-]+:\d+(\/.*)?$/.test(trimmed)
  const candidate = hasScheme && !hostPort ? trimmed : `https://${trimmed}`

  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    return null
  }

  if (!VALID_SCHEMES.has(url.protocol)) return null

  const host = url.hostname.toLowerCase()
  const isLocal = host === 'localhost' || host.endsWith('.localhost')
  const isIpV4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(host)
  const isIpV6 = host.startsWith('[') && host.endsWith(']')
  if (!host.includes('.') && !isLocal && !isIpV4 && !isIpV6) return null

  return { url, assumedScheme: !hasScheme || hostPort }
}

export function normalizeUrlToString(input: string): string | null {
  const result = normalizeUrl(input)
  return result ? result.url.toString() : null
}

export function isIpHost(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || (host.startsWith('[') && host.endsWith(']'))
}

export function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase()
  if (h === 'localhost' || h.endsWith('.localhost')) return true
  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (ipv4) {
    const a = Number(ipv4[1])
    const b = Number(ipv4[2])
    return a === 10 || a === 127 || a === 0 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254)
  }
  return h.startsWith('[')
}

export function hasPunycode(host: string): boolean {
  return host.includes('xn--')
}

/** Well-known URL parameters used for click/visit attribution. */
export const TRACKING_PARAM_NAMES = new Set([
  'fbclid',
  'gclid',
  'gbraid',
  'wbraid',
  'msclkid',
  'dclid',
  'twclid',
  'ttclid',
  'igshid',
  'igsh',
  'li_fat_id',
  'mc_cid',
  'mc_eid',
  'yclid',
  '_gl',
  'rb_clickid',
  's_kwcid',
  'wickedid',
  'oly_anon_id',
  'oly_enc_id',
  'vero_id',
  'spm',
])

export interface ParamAudit {
  tracking: { name: string; value: string }[]
  cleanedUrl: URL | null
}

/** Heuristic: should this input be opened as a URL instead of searched for? */
export function looksLikeUrl(input: string): boolean {
  const s = input.trim()
  if (!s || /\s/.test(s)) return false
  if (/^(https?):\/\//i.test(s)) return true
  if (/^localhost(:\d+)?([/?#].*)?$/i.test(s)) return true
  if (/^(\d{1,3}\.){3}\d{1,3}(:\d+)?([/?#].*)?$/.test(s)) return true
  if (/^[\w-]+(\.[\w-]+)+(:\d+)?([/?#].*)?$/i.test(s)) {
    const host = s.split(/[/:?#]/)[0]
    const tld = host.split('.').pop() ?? ''
    return /^[a-z]{2,}$/i.test(tld)
  }
  return false
}

/** Detect tracking parameters and produce a cleaned copy of the URL. */
export function auditParams(url: URL): ParamAudit {
  const tracking: { name: string; value: string }[] = []
  url.searchParams.forEach((value, name) => {
    const n = name.toLowerCase()
    if (n.startsWith('utm_') || TRACKING_PARAM_NAMES.has(n)) {
      tracking.push({ name, value })
    }
  })
  if (!tracking.length) return { tracking, cleanedUrl: null }

  const cleaned = new URL(url.toString())
  for (const t of tracking) cleaned.searchParams.delete(t.name)
  let s = cleaned.toString()
  if (s.endsWith('?')) s = s.slice(0, -1)
  return { tracking, cleanedUrl: new URL(s) }
}
