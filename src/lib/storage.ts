import type { Favorite, Settings, VaultStore } from '@/types'
import type { HistoryEntry } from '@/types'
import { STORAGE_KEY, STORE_VERSION } from '@/lib/app'
import { DEFAULT_FAVORITES, sanitizeFavorites } from '@/lib/favorites'
import { sanitizeChecklist, sanitizeSettings } from '@/lib/export'
import { sanitizeHistory } from '@/lib/history'

export interface PersistedStore {
  version: number
  settings: Settings
  favorites: Favorite[]
  checklist: Record<string, boolean>
  demo: boolean
  /** Encrypted password vault; null until the user creates one. */
  vault: VaultStore | null
  /** Opt-in local history; entries only exist while historyEnabled is true. */
  history: HistoryEntry[]
}

export function defaultSettings(): Settings {
  let hour12 = false
  try {
    hour12 = Intl.DateTimeFormat().resolvedOptions().hour12 ?? false
  } catch {
    hour12 = false
  }
  return {
    theme: 'dark',
    accent: 'blue',
    layout: 'comfortable',
    engine: 'duckduckgo',
    searchInNewTab: true,
    showSiteIcons: true,
    historyEnabled: false,
    startupMode: 'dashboard',
    clock: {
      visible: true,
      format: hour12 ? '12h' : '24h',
      showDate: true,
      showSeconds: false,
    },
  }
}

export function freshStore(): PersistedStore {
  return {
    version: STORE_VERSION,
    settings: defaultSettings(),
    favorites: DEFAULT_FAVORITES.map((f) => ({ ...f })),
    checklist: {},
    demo: true,
    vault: null,
    history: [],
  }
}

/** Validate the persisted vault shape; return null if anything looks wrong. */
function sanitizeVault(raw: unknown): VaultStore | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  const isB64 = (v: unknown) => typeof v === 'string' && v.length > 0 && v.length < 8192
  if (!isB64(r.salt)) return null
  const iterations = typeof r.iterations === 'number' ? r.iterations : 0
  if (iterations < 50_000 || iterations > 5_000_000) return null
  const verifier = r.verifier as Record<string, unknown> | undefined
  if (!verifier || !isB64(verifier.iv) || !isB64(verifier.data)) return null
  const entries = Array.isArray(r.entries)
    ? r.entries.filter(
        (e): e is VaultStore['entries'][number] =>
          !!e &&
          typeof e === 'object' &&
          typeof (e as Record<string, unknown>).id === 'string' &&
          typeof (e as Record<string, unknown>).iv === 'string' &&
          typeof (e as Record<string, unknown>).data === 'string',
      ).slice(0, 500)
    : []
  return {
    salt: r.salt as string,
    iterations,
    verifier: { iv: verifier.iv as string, data: verifier.data as string },
    entries,
  }
}

function mergeSettings(saved: unknown): Settings {
  const base = defaultSettings()
  const patch = sanitizeSettings(saved)
  if (!patch) return base
  return {
    ...base,
    ...patch,
    clock: { ...base.clock, ...(patch.clock ?? {}) },
  }
}

/** Load and validate the persisted store; fall back to fresh defaults on any problem. */
export function loadStore(): PersistedStore {
  try {
    // Desktop: the app-data file is canonical — it survives version upgrades
    // even if the renderer's localStorage is wiped.
    const desktop = typeof window !== 'undefined' ? window.veloraDesktop : undefined
    const fileStore = desktop?.getStore?.()
    const fromFile = fileStore ? parseStored(fileStore) : null
    if (fromFile) return fromFile

    const fromLS = parseStored(localStorage.getItem(STORAGE_KEY))
    if (fromLS) return fromLS
    return freshStore()
  } catch {
    return freshStore()
  }
}

function parseStored(raw: string | null): PersistedStore | null {
  try {
    if (!raw) return null
    const data = JSON.parse(raw.replace(/^\uFEFF/, ''))
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null

    const settings = mergeSettings((data as Record<string, unknown>).settings)

    let favorites: Favorite[]
    const rawFavorites = (data as Record<string, unknown>).favorites
    if (Array.isArray(rawFavorites)) {
      favorites = sanitizeFavorites(rawFavorites).favorites
    } else {
      favorites = DEFAULT_FAVORITES.map((f) => ({ ...f }))
    }

    const checklist = sanitizeChecklist((data as Record<string, unknown>).checklist) ?? {}
    const demo =
      typeof (data as Record<string, unknown>).demo === 'boolean'
        ? ((data as Record<string, unknown>).demo as boolean)
        : false
    const vault = sanitizeVault((data as Record<string, unknown>).vault)
    const history = sanitizeHistory((data as Record<string, unknown>).history)

    return { version: STORE_VERSION, settings, favorites, checklist, demo, vault, history }
  } catch {
    return null
  }
}

export function saveStore(store: PersistedStore): boolean {
  try {
    const json = JSON.stringify(store)
    localStorage.setItem(STORAGE_KEY, json)
    const desktop = typeof window !== 'undefined' ? window.veloraDesktop : undefined
    desktop?.saveStore?.(json)
    return true
  } catch {
    return false
  }
}

export function wipeStore(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
  try {
    const desktop = typeof window !== 'undefined' ? window.veloraDesktop : undefined
    desktop?.clearStore?.()
  } catch {
    // ignore
  }
}

/** Approximate bytes used by the stored payload (UTF-16). */
export function storeSizeBytes(): number {
  try {
    return (localStorage.getItem(STORAGE_KEY) ?? '').length * 2
  } catch {
    return 0
  }
}
