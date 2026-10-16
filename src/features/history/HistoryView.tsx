import { useMemo, useState } from 'react'
import { ArrowUpRight, Globe, History, Link2, Search, Settings2, Trash2 } from 'lucide-react'
import { useStore } from '@/lib/store'
import { dayLabel, timeLabel } from '@/lib/history'
import { hostnameOf } from '@/lib/favorites'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

const kindIcon = {
  shortcut: Link2,
  search: Search,
  address: Globe,
} as const

export function HistoryView() {
  const { history, settings, removeHistoryEntry, clearHistory } = useStore()
  const [filter, setFilter] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return history
    return history.filter(
      (h) => h.title.toLowerCase().includes(q) || hostnameOf(h.url).includes(q),
    )
  }, [history, filter])

  const groups = useMemo(() => {
    const out: { label: string; entries: typeof history }[] = []
    for (const entry of visible) {
      const label = dayLabel(entry.at)
      const last = out[out.length - 1]
      if (last && last.label === label) last.entries.push(entry)
      else out.push({ label, entries: [entry] })
    }
    return out
  }, [visible])

  if (!settings.historyEnabled) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 pt-14 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <History size={26} />
        </span>
        <h1 className="text-xl font-semibold tracking-tight">History is off</h1>
        <p className="text-sm leading-relaxed text-muted">
          Velora records nothing by default. You can turn on local history in Settings — it stays
          on this device, is capped at 500 entries, and is excluded from backups.
        </p>
        <Button variant="secondary" onClick={() => (window.location.hash = '#/dashboard')}>
          Back to dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pt-8 md:pt-12">
      <header className="flex flex-wrap items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <History size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight">History</h1>
          <p className="text-xs text-faint">
            {history.length} of 500 entries · local only · excluded from backups
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setConfirmClear(true)}>
          <Trash2 size={14} />
          Clear
        </Button>
      </header>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search history"
          aria-label="Search history"
          className="input pl-9"
        />
      </div>

      {history.length === 0 ? (
        <div className="panel flex flex-col items-center gap-2.5 px-6 py-12 text-center">
          <p className="text-sm font-medium text-ink">Nothing recorded yet</p>
          <p className="max-w-sm text-xs leading-relaxed text-faint">
            Open a shortcut, run a search, or type an address — Velora will log it here, locally.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <section key={group.label}>
              <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">
                {group.label}
              </h2>
              <ul className="panel divide-y divide-line overflow-hidden">
                {group.entries.map((entry) => {
                  const Icon = kindIcon[entry.kind]
                  return (
                    <li key={entry.id} className="group flex items-center gap-3 px-4 py-2.5">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-raised text-muted">
                        <Icon size={13} />
                      </span>
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-w-0 flex-1 items-center gap-1.5"
                        title={entry.url}
                      >
                        <span className="truncate text-sm text-ink group-hover:text-accent">
                          {entry.title}
                        </span>
                        <ArrowUpRight size={11} className="shrink-0 text-faint" />
                      </a>
                      <span className="hidden shrink-0 text-xs text-faint sm:block">
                        {hostnameOf(entry.url)}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-faint">
                        {timeLabel(entry.at)}
                      </span>
                      <button
                        onClick={() => removeHistoryEntry(entry.id)}
                        aria-label={`Remove ${entry.title} from history`}
                        className="shrink-0 text-faint opacity-0 transition-opacity duration-100 hover:text-rose-500 group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <Trash2 size={13} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
          {visible.length === 0 && (
            <p className="panel px-4 py-6 text-center text-sm text-faint">No entries match.</p>
          )}
        </div>
      )}

      <p className="flex items-center gap-1.5 px-1 text-[11px] leading-relaxed text-faint">
        <Settings2 size={12} />
        Pause or clear history anytime in Settings — it never leaves this browser and is never
        included in backups.
      </p>

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={clearHistory}
        title="Clear history"
        message={`This deletes all ${history.length} recorded entries from this browser. It cannot be undone.`}
        confirmLabel="Clear history"
      />
    </div>
  )
}
