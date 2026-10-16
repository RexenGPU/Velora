import type { CustomEngine, EngineId } from '@/types'
import { normalizeUrlToString } from '@/lib/url'

export interface SearchEngine {
  id: EngineId
  name: string
  tagline: string
  searchUrl: string
  policyUrl: string
}

export const SEARCH_ENGINES: SearchEngine[] = [
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    tagline: 'Privacy-focused; searches are not tied to your identity.',
    searchUrl: 'https://duckduckgo.com/?q=%s',
    policyUrl: 'https://duckduckgo.com/privacy',
  },
  {
    id: 'brave',
    name: 'Brave Search',
    tagline: 'Independent index; anonymized search profiles.',
    searchUrl: 'https://search.brave.com/search?q=%s',
    policyUrl: 'https://search.brave.com/privacy-policy',
  },
  {
    id: 'startpage',
    name: 'Startpage',
    tagline: 'Google results through an anonymizing proxy.',
    searchUrl: 'https://www.startpage.com/sp/search?query=%s',
    policyUrl: 'https://www.startpage.com/en/privacy-policy',
  },
  {
    id: 'mojeek',
    name: 'Mojeek',
    tagline: 'Independent crawler and index; no tracking.',
    searchUrl: 'https://www.mojeek.com/search?q=%s',
    policyUrl: 'https://www.mojeek.com/privacy',
  },
  {
    id: 'google',
    name: 'Google',
    tagline: 'Largest index; queries may be linked to your account.',
    searchUrl: 'https://www.google.com/search?q=%s',
    policyUrl: 'https://policies.google.com/privacy',
  },
]

export const DEFAULT_ENGINE_ID: EngineId = 'duckduckgo'

/** Validate a user-defined engine: a name and an http(s) template containing %s. */
export function validCustomEngine(raw: unknown): raw is CustomEngine {
  if (!raw || typeof raw !== 'object') return false
  const c = raw as Record<string, unknown>
  if (typeof c.name !== 'string' || !c.name.trim() || c.name.trim().length > 32) return false
  if (typeof c.urlTemplate !== 'string' || !c.urlTemplate.includes('%s')) return false
  const probe = normalizeUrlToString(c.urlTemplate.split('%s').join('probe'))
  return probe !== null && /^https?:\/\//.test(probe)
}

/** Build the engine object for a settings snapshot (handles the custom engine). */
export function getEngine(id: EngineId | string | undefined, custom?: CustomEngine): SearchEngine {
  if (id === 'custom' && custom && validCustomEngine(custom)) {
    return {
      id: 'custom',
      name: custom.name.trim(),
      tagline: 'Your custom search engine.',
      searchUrl: custom.urlTemplate,
      policyUrl: '',
    }
  }
  return SEARCH_ENGINES.find((e) => e.id === id) ?? SEARCH_ENGINES[0]
}

/** Engine list for pickers — includes the custom engine when defined. */
export function getEngineList(custom?: CustomEngine): SearchEngine[] {
  if (custom && validCustomEngine(custom)) {
    return [...SEARCH_ENGINES, getEngine('custom', custom)]
  }
  return SEARCH_ENGINES
}

export function buildSearchUrl(engine: SearchEngine, query: string): string {
  return engine.searchUrl.replace('%s', encodeURIComponent(query))
}
