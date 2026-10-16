import type { Favorite } from '@/types'
import { MAX_FAVORITES } from '@/lib/app'
import { normalizeUrlToString } from '@/lib/url'

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** Validate and normalize a single favorite record (used for imports). */
export function sanitizeFavorite(raw: unknown): Favorite | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  const name = typeof r.name === 'string' ? r.name.trim().slice(0, 64) : ''
  const urlString = typeof r.url === 'string' ? r.url.trim() : ''
  const normalized = normalizeUrlToString(urlString)
  if (!name || !normalized) return null

  const icon = typeof r.icon === 'string' ? r.icon.trim().slice(0, 8) : ''
  const category = typeof r.category === 'string' ? r.category.trim().slice(0, 24) : ''
  const id =
    typeof r.id === 'string' && r.id.length <= 64 && /^[\w-]+$/.test(r.id)
      ? r.id
      : newId()

  const fav: Favorite = { id, name, url: normalized }
  if (icon) fav.icon = icon
  if (category) fav.category = category
  return fav
}

export function sanitizeFavorites(raw: unknown): { favorites: Favorite[]; skipped: number } {
  if (!Array.isArray(raw)) return { favorites: [], skipped: 0 }
  const favorites: Favorite[] = []
  let skipped = 0
  for (const item of raw) {
    const fav = sanitizeFavorite(item)
    if (fav && favorites.length < MAX_FAVORITES) favorites.push(fav)
    else skipped += 1
  }
  return { favorites, skipped }
}

/** Deterministic hue index (0–7) for letter tiles. */
export function colorIndexFor(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % 8
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

/** Optional starter shortcuts — users can remove or replace them. */
export const DEFAULT_FAVORITES: Favorite[] = [
  { id: 'ddg', name: 'DuckDuckGo', url: 'https://duckduckgo.com/', category: 'Search' },
  { id: 'wikipedia', name: 'Wikipedia', url: 'https://www.wikipedia.org/', category: 'Reference' },
  { id: 'github', name: 'GitHub', url: 'https://github.com/', category: 'Dev' },
  { id: 'mdn', name: 'MDN', url: 'https://developer.mozilla.org/', category: 'Dev' },
  { id: 'hn', name: 'Hacker News', url: 'https://news.ycombinator.com/', category: 'Reading' },
  { id: 'eff', name: 'EFF', url: 'https://www.eff.org/', category: 'Privacy' },
  { id: 'privacy-guides', name: 'Privacy Guides', url: 'https://privacyguides.org/', category: 'Privacy' },
  { id: 'cyt', name: 'Cover Your Tracks', url: 'https://coveryourtracks.eff.org/', category: 'Privacy' },
]
