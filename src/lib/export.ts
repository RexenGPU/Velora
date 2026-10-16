import type { ClockSettings, Favorite, Settings, SettingsPatch } from '@/types'
import { MAX_BACKUP_BYTES } from '@/lib/app'
import { sanitizeFavorites } from '@/lib/favorites'
import { SEARCH_ENGINES, validCustomEngine } from '@/lib/engines'
import { normalizeUrlToString } from '@/lib/url'

export interface Backup {
  version: number
  exportedAt: string
  favorites: Favorite[]
  settings: Settings
  checklist: Record<string, boolean>
}

export function createBackup(state: {
  favorites: Favorite[]
  settings: Settings
  checklist: Record<string, boolean>
}): Backup {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    favorites: state.favorites,
    settings: state.settings,
    checklist: state.checklist,
  }
}

export function serializeBackup(backup: Backup): string {
  return JSON.stringify(backup, null, 2)
}

const THEME_MODES = new Set(['light', 'dark', 'system'])
const ACCENTS = new Set(['blue', 'cyan', 'violet', 'green', 'amber', 'rose'])
const LAYOUTS = new Set(['comfortable', 'compact'])
const ENGINES = new Set([...SEARCH_ENGINES.map((e) => e.id), 'custom'])

/** Validate a partial settings object from an imported backup. */
export function sanitizeSettings(raw: unknown): SettingsPatch | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const out: SettingsPatch = {}

  if (typeof r.theme === 'string' && THEME_MODES.has(r.theme)) out.theme = r.theme as Settings['theme']
  if (typeof r.accent === 'string' && ACCENTS.has(r.accent)) out.accent = r.accent as Settings['accent']
  if (typeof r.layout === 'string' && LAYOUTS.has(r.layout)) out.layout = r.layout as Settings['layout']
  if (typeof r.engine === 'string' && (ENGINES as Set<string>).has(r.engine)) out.engine = r.engine as Settings['engine']
  if (validCustomEngine(r.customEngine)) out.customEngine = r.customEngine
  if (r.startupMode === 'custom' || r.startupMode === 'dashboard') {
    out.startupMode = r.startupMode as Settings['startupMode']
  }
  if (typeof r.startupUrl === 'string') {
    const normalized = normalizeUrlToString(r.startupUrl)
    if (normalized) {
      out.startupUrl = normalized
      // Migration: a saved startup URL implies custom mode.
      if (!out.startupMode) out.startupMode = 'custom'
    }
  }
  if (typeof r.searchInNewTab === 'boolean') out.searchInNewTab = r.searchInNewTab
  if (typeof r.showSiteIcons === 'boolean') out.showSiteIcons = r.showSiteIcons
  if (typeof r.historyEnabled === 'boolean') out.historyEnabled = r.historyEnabled

  if (r.clock && typeof r.clock === 'object') {
    const c = r.clock as Record<string, unknown>
    const clock: Partial<ClockSettings> = {}
    if (typeof c.visible === 'boolean') clock.visible = c.visible
    if (c.format === '12h' || c.format === '24h') clock.format = c.format
    if (typeof c.showDate === 'boolean') clock.showDate = c.showDate
    if (typeof c.showSeconds === 'boolean') clock.showSeconds = c.showSeconds
    if (Object.keys(clock).length) out.clock = clock
  }

  return Object.keys(out).length ? out : null
}

export function sanitizeChecklist(raw: unknown): Record<string, boolean> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const out: Record<string, boolean> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (typeof key === 'string' && key.length <= 64 && typeof value === 'boolean') {
      out[key] = value
    }
  }
  return Object.keys(out).length ? out : null
}

export type ParsedImport = {
  favorites: Favorite[]
  settings: SettingsPatch | null
  checklist: Record<string, boolean> | null
  skipped: number
}

export type ParseResult = { ok: true; data: ParsedImport } | { ok: false; message: string }

/** Parse and validate a backup file's text content. */
export function parseBackup(text: string): ParseResult {
  if (text.length > MAX_BACKUP_BYTES) {
    return { ok: false, message: 'File is too large (over 1 MB).' }
  }

  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, message: 'This file is not valid JSON.' }
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, message: 'Unexpected file structure — expected a Velora backup object.' }
  }

  const obj = data as Record<string, unknown>
  const { favorites, skipped } = sanitizeFavorites(obj.favorites)
  const settings = sanitizeSettings(obj.settings)
  const checklist = sanitizeChecklist(obj.checklist)

  if (!favorites.length && !settings) {
    return { ok: false, message: 'No shortcuts or settings found in this file.' }
  }

  return { ok: true, data: { favorites, settings, checklist, skipped } }
}
