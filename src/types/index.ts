export type ThemeMode = 'light' | 'dark' | 'system'
export type AccentId = 'blue' | 'cyan' | 'violet' | 'green' | 'amber' | 'rose'
export type LayoutMode = 'comfortable' | 'compact'
export type ClockFormat = '12h' | '24h'
export type StartupMode = 'dashboard' | 'custom'

export type EngineId = 'duckduckgo' | 'brave' | 'startpage' | 'mojeek' | 'google' | 'custom'

/** User-defined search engine (urlTemplate must contain a %s placeholder). */
export interface CustomEngine {
  name: string
  urlTemplate: string
}

export interface ClockSettings {
  visible: boolean
  format: ClockFormat
  showDate: boolean
  showSeconds: boolean
}

export interface Settings {
  theme: ThemeMode
  accent: AccentId
  layout: LayoutMode
  engine: EngineId
  customEngine?: CustomEngine
  searchInNewTab: boolean
  showSiteIcons: boolean
  historyEnabled: boolean
  startupMode: StartupMode
  startupUrl?: string
  clock: ClockSettings
}

export type SettingsPatch = {
  theme?: ThemeMode
  accent?: AccentId
  layout?: LayoutMode
  engine?: EngineId
  customEngine?: CustomEngine
  searchInNewTab?: boolean
  showSiteIcons?: boolean
  historyEnabled?: boolean
  startupMode?: StartupMode
  startupUrl?: string
  clock?: Partial<ClockSettings>
}

export interface Favorite {
  id: string
  name: string
  url: string
  icon?: string
  category?: string
}

export type TrackerCategory =
  | 'advertising'
  | 'analytics'
  | 'session-replay'
  | 'social'
  | 'attribution'
  | 'fingerprinting'
  | 'monitoring'

export interface TrackerEntry {
  domain: string
  operator: string
  category: TrackerCategory
  note?: string
  stance?: 'privacy-conscious'
}

export interface TrackerMatch {
  entry: TrackerEntry
  host: string
}

/* ---------- Password vault (encrypted at rest) ---------- */

/** A single encrypted entry as persisted in localStorage. */
export interface VaultEntry {
  id: string
  iv: string
  data: string
}

/** Vault metadata + encrypted entries. The master password is never stored. */
export interface VaultStore {
  salt: string
  iterations: number
  verifier: { iv: string; data: string }
  entries: VaultEntry[]
}

/** A decrypted vault item (exists only in memory while unlocked). */
export interface VaultItem {
  id: string
  name: string
  url: string
  username: string
  password: string
  notes?: string
  /** Opt-in: fill and submit the login form on matching sites while unlocked. */
  autoLogin?: boolean
}

/* ---------- Browsing history (opt-in, disabled by default) ---------- */

export type HistoryKind = 'shortcut' | 'search' | 'address'

export interface HistoryEntry {
  id: string
  kind: HistoryKind
  title: string
  url: string
  at: number
}
