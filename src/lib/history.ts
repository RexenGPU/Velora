import type { HistoryEntry, HistoryKind } from '@/types'
import { HISTORY_LIMIT } from '@/lib/app'

const KINDS = new Set<HistoryKind>(['shortcut', 'search', 'address'])

export function sanitizeHistoryEntry(raw: unknown): HistoryEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  const title = typeof r.title === 'string' ? r.title.trim().slice(0, 120) : ''
  const urlString = typeof r.url === 'string' ? r.url : ''
  let url: URL
  try {
    url = new URL(urlString)
  } catch {
    return null
  }
  if (!['http:', 'https:'].includes(url.protocol)) return null
  if (!title) return null

  const kind = KINDS.has(r.kind as HistoryKind) ? (r.kind as HistoryKind) : 'shortcut'
  const at = typeof r.at === 'number' && r.at > 0 && Number.isFinite(r.at) ? r.at : Date.now()
  const id =
    typeof r.id === 'string' && r.id.length <= 64 && /^[\w-]+$/.test(r.id)
      ? r.id
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

  return { id, kind, title, url: url.toString(), at }
}

export function sanitizeHistory(raw: unknown): HistoryEntry[] {
  if (!Array.isArray(raw)) return []
  const out: HistoryEntry[] = []
  for (const item of raw) {
    const entry = sanitizeHistoryEntry(item)
    if (entry && out.length < HISTORY_LIMIT) out.push(entry)
  }
  return out
}

const dayFormatterCache = new Map<string, Intl.DateTimeFormat>()
function dayFormatter(): Intl.DateTimeFormat {
  let f = dayFormatterCache.get('d')
  if (!f) {
    f = new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    dayFormatterCache.set('d', f)
  }
  return f
}

const timeFormatterCache = new Map<string, Intl.DateTimeFormat>()
function timeFormatter(): Intl.DateTimeFormat {
  let f = timeFormatterCache.get('t')
  if (!f) {
    f = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })
    timeFormatterCache.set('t', f)
  }
  return f
}

export function dayLabel(timestamp: number, now = Date.now()): string {
  const d = new Date(timestamp)
  const startOfDay = (t: number) => new Date(new Date(t).setHours(0, 0, 0, 0)).getTime()
  const days = Math.round((startOfDay(now) - startOfDay(timestamp)) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return dayFormatter().format(d)
}

export function timeLabel(timestamp: number): string {
  return timeFormatter().format(new Date(timestamp))
}
