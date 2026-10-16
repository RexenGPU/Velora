import type { ClockFormat } from '@/types'

export function greeting(now: Date): string {
  const h = now.getHours()
  if (h < 5) return 'Good night'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

const formatCache = new Map<string, Intl.DateTimeFormat>()

function getFormatter(key: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  let f = formatCache.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat(undefined, options)
    formatCache.set(key, f)
  }
  return f
}

export function formatClockParts(now: Date, format: ClockFormat, showSeconds: boolean): Intl.DateTimeFormatPart[] {
  return getFormatter(`cp-${format}-${showSeconds}`, {
    hour: format === '12h' ? 'numeric' : '2-digit',
    minute: '2-digit',
    ...(showSeconds ? { second: '2-digit' } : {}),
    hour12: format === '12h',
  }).formatToParts(now)
}

export function formatDate(now: Date): string {
  return getFormatter('d', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(now)
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}
