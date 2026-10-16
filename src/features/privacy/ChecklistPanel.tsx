import { useMemo, useState } from 'react'
import { Check, Copy, Search, ShieldCheck } from 'lucide-react'
import { CATEGORY_META, TRACKERS, TRACKER_CATEGORIES } from '@/lib/trackers'
import { Panel } from '@/components/ui/Panel'
import { useToast } from '@/components/ui/Toast'
import { useStore } from '@/lib/store'

export function TrackerListPanel() {
  const { push } = useToast()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return TRACKERS.filter((t) => {
      if (category && t.category !== category) return false
      if (q && !t.domain.includes(q) && !t.operator.toLowerCase().includes(q)) return false
      return true
    })
  }, [query, category])

  const copyDomain = (domain: string) => {
    void navigator.clipboard?.writeText(domain)
    push('Domain copied')
  }

  return (
    <Panel title="Tracker reference" icon={<ShieldCheck size={15} />}>
      <p className="mb-3 text-xs leading-relaxed text-faint">
        This reference powers the inspector. It's a curated subset of well-known tracking domains —
        not a complete blocklist. Velora never fetches or blocks anything; it only matches URLs you
        type.
      </p>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search domain or operator"
            aria-label="Search tracker list"
            className="input pl-9"
          />
        </div>
        <select
          value={category ?? ''}
          onChange={(e) => setCategory(e.target.value || null)}
          aria-label="Filter by category"
          className="input sm:w-44"
        >
          <option value="">All categories</option>
          {TRACKER_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_META[c].label}
            </option>
          ))}
        </select>
      </div>

      <p className="mb-2 text-xs text-faint">
        {filtered.length} of {TRACKERS.length} entries
      </p>

      <ul className="max-h-72 overflow-y-auto rounded-lg border border-line">
        {filtered.map((t) => (
          <li
            key={t.domain}
            className="flex items-center gap-3 border-b border-line px-3 py-2 last:border-b-0"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-xs text-ink">{t.domain}</p>
              <p className="mt-0.5 truncate text-[11px] text-faint">
                {t.operator}
                {t.note ? ` — ${t.note}` : ''}
              </p>
            </div>
            <span className="chip shrink-0 text-[10px]">{CATEGORY_META[t.category].label}</span>
            {t.stance === 'privacy-conscious' && (
              <span className="chip shrink-0 border-emerald-500/30 text-[10px] text-emerald-500">
                privacy-conscious
              </span>
            )}
            <button
              onClick={() => copyDomain(t.domain)}
              aria-label={`Copy ${t.domain}`}
              className="shrink-0 text-faint transition-colors hover:text-ink"
            >
              <Copy size={13} />
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-3 py-6 text-center text-xs text-faint">No entries match.</li>
        )}
      </ul>
    </Panel>
  )
}

export function ChecklistPanel() {
  const { checklist, setChecklistItem } = useStore()
  const { push } = useToast()

  const items = useMemo(
    () => [
      {
        id: 'block-3p-cookies',
        title: 'Block third-party cookies',
        detail:
          "Third-party cookies are the backbone of cross-site tracking. All major browsers now block or restrict them by default — verify yours does.",
        paths: [
          { browser: 'Firefox', path: 'about:preferences#privacy → Enhanced Tracking Protection: Strict' },
          { browser: 'Chrome', path: 'chrome://settings/cookies → Block third-party cookies' },
          { browser: 'Edge', path: 'edge://settings/privacy → Tracking prevention: Strict' },
          { browser: 'Safari', path: 'Settings → Privacy → Block all cookies (or leave ITP on)' },
        ],
      },
      {
        id: 'https-only',
        title: 'Enable HTTPS-Only mode',
        detail:
          'Forces encrypted connections and warns before falling back to HTTP. Firefox: about:preferences#privacy → HTTPS-Only Mode. Chrome: Settings → Privacy and security → Always use secure connections.',
      },
      {
        id: 'review-extensions',
        title: 'Review extension permissions',
        detail:
          "Extensions can read and change data on sites you visit. Remove ones you don't actively use, and prefer open-source options.",
      },
      {
        id: 'secure-dns',
        title: 'Consider secure DNS (DoH)',
        detail:
          'Encrypts DNS lookups so your local network can\'t tamper with them. Note: this shifts trust to your resolver provider (e.g. Cloudflare, Quad9).',
      },
      {
        id: 'gpc',
        title: 'Enable Global Privacy Control',
        detail:
          'Where supported, GPC sends a legally-backed opt-out signal to sites you visit. Enable it in your browser or via a privacy extension.',
        url: { href: 'https://globalprivacycontrol.org', label: 'globalprivacycontrol.org' },
      },
      {
        id: 'private-window-habit',
        title: 'Use private windows appropriately',
        detail:
          "Private windows protect the device you're on — they don't hide activity from sites, your ISP, or your network. See the comparison below.",
      },
    ],
    [],
  )

  const done = items.filter((i) => checklist[i.id]).length
  const pct = Math.round((done / items.length) * 100)

  const copyPath = (path: string) => {
    void navigator.clipboard?.writeText(path)
    push('Path copied')
  }

  return (
    <Panel title="Privacy checklist" icon={<Check size={15} />}>
      <div className="mb-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-raised">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs tabular-nums text-faint">
          {done}/{items.length}
        </span>
      </div>
      <p className="mb-4 text-[11px] leading-relaxed text-faint">
        Progress is stored locally — clearing Velora's data resets it.
      </p>

      <ul className="flex flex-col gap-2.5">
        {items.map((item) => {
          const checked = !!checklist[item.id]
          return (
            <li
              key={item.id}
              className={`rounded-lg border px-3.5 py-3 transition-colors duration-150 ${
                checked ? 'border-accent/30 bg-accent-soft/40' : 'border-line bg-raised/40'
              }`}
            >
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecklistItem(item.id, e.target.checked)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded border transition-colors duration-150 ${
                    checked ? 'border-accent bg-accent text-on-accent' : 'border-line-strong bg-surface'
                  }`}
                >
                  {checked && <Check size={11} strokeWidth={3} />}
                </span>
                <span className="min-w-0">
                  <span className={`block text-sm font-medium ${checked ? 'text-faint line-through' : 'text-ink'}`}>
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-faint">{item.detail}</span>
                  {item.paths && (
                    <span className="mt-2 flex flex-col gap-1">
                      {item.paths.map((p) => (
                        <span key={p.browser} className="flex items-center gap-1.5 text-[11px] text-muted">
                          <span className="font-medium">{p.browser}:</span>
                          <code className="rounded bg-raised px-1.5 py-0.5 font-mono text-[10px] text-faint">
                            {p.path}
                          </code>
                          <button
                            onClick={() => copyPath(p.path)}
                            aria-label={`Copy ${p.browser} path`}
                            className="text-faint transition-colors hover:text-ink"
                          >
                            <Copy size={11} />
                          </button>
                        </span>
                      ))}
                    </span>
                  )}
                  {item.url && (
                    <a
                      href={item.url.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1 text-xs text-accent hover:text-accent-strong"
                    >
                      {item.url.label}
                    </a>
                  )}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
