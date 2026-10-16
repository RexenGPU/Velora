import { useRef, useState, type FormEvent } from 'react'
import { Globe, Search, X } from 'lucide-react'
import { useStore } from '@/lib/store'
import { buildSearchUrl, getEngine, getEngineList } from '@/lib/engines'
import { looksLikeUrl, normalizeUrlToString } from '@/lib/url'
import { hostnameOf } from '@/lib/favorites'
import { DropdownMenu } from '@/components/ui/DropdownMenu'
import { IconButton } from '@/components/ui/IconButton'

export function SearchBar() {
  const { settings, setSettings, recordHistory } = useStore()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const engine = getEngine(settings.engine, settings.customEngine)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) {
      inputRef.current?.focus()
      return
    }
    // Address-bar behavior: a web address opens directly, everything else searches.
    const target = looksLikeUrl(q) ? normalizeUrlToString(q) : null
    const url = target ?? buildSearchUrl(engine, q)
    recordHistory(
      target ? 'address' : 'search',
      target ? hostnameOf(target) : q,
      url,
    )
    if (settings.searchInNewTab && !target) {
      window.open(url, '_blank', 'noopener,noreferrer')
    } else {
      window.location.href = url
    }
  }

  return (
    <div>
      <form
        role="search"
        onSubmit={onSubmit}
        className="panel flex h-13 items-center gap-1.5 rounded-full pl-1.5 pr-1.5 transition-all duration-200 focus-within:border-accent/50 focus-within:shadow-[0_0_0_4px_var(--v-accent-soft)] sm:h-14 sm:pl-2 sm:pr-2"
      >
        <DropdownMenu
          label="Choose search engine"
          align="start"
          trigger={
            <span className="flex items-center gap-1.5">
              <Globe size={14} className="text-faint" />
              <span className="max-w-24 truncate font-medium">{engine.name}</span>
            </span>
          }
          items={getEngineList(settings.customEngine).map((e) => ({
            label: e.name,
            description: e.tagline,
            onSelect: () => setSettings({ engine: e.id }),
          }))}
        />
        <span className="h-6 w-px bg-line" aria-hidden="true" />
        <input
          id="velora-search"
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the web or enter an address"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="Search query or web address"
          className="min-w-0 flex-1 bg-transparent px-1.5 text-[15px] text-ink outline-none placeholder:text-faint"
        />
        {query && (
          <IconButton label="Clear search" size="sm" onClick={() => setQuery('')}>
            <X size={14} />
          </IconButton>
        )}
        <span className="kbd-hint hidden items-center pr-1.5 sm:flex">
          <kbd className="kbd">/</kbd>
        </span>
        <button
          type="submit"
          aria-label="Search"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent transition-all duration-150 hover:bg-accent-strong active:scale-95"
        >
          <Search size={16} />
        </button>
      </form>
      <p className="mt-2.5 text-center text-xs text-faint">
        <span className="kbd-hint">
          Press <kbd className="kbd">/</kbd> to focus ·{' '}
        </span>
        Sent directly to {engine.name} — Velora doesn't proxy or save queries.
      </p>
    </div>
  )
}
