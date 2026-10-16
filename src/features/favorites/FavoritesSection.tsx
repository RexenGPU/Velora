import { useMemo, useState } from 'react'
import { Info, MoreHorizontal, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/Logo'
import { DropdownMenu } from '@/components/ui/DropdownMenu'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FavoriteCard } from '@/features/favorites/FavoriteCard'
import { FavoriteForm } from '@/features/favorites/FavoriteForm'

export function FavoritesSection() {
  const { favorites, demo, restoreExamples, setFavorites, settings } = useStore()
  const { push } = useToast()
  const [filter, setFilter] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const compact = settings.layout === 'compact'

  const categories = useMemo(
    () => Array.from(new Set(favorites.map((f) => f.category).filter(Boolean))) as string[],
    [favorites],
  )

  const visible = filter ? favorites.filter((f) => f.category === filter) : favorites

  return (
    <div className="w-full">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">
          Quick links
        </h2>
        <span className="chip">{favorites.length}</span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => setFormOpen(true)}>
            <Plus size={14} />
            Add
          </Button>
          <DropdownMenu
            label="Quick links options"
            trigger={
              <span className="inline-flex size-8 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-raised hover:text-ink">
                <MoreHorizontal size={16} />
              </span>
            }
            items={[
              {
                icon: RotateCcw,
                label: 'Restore starter shortcuts',
                onSelect: () => setConfirmRestore(true),
              },
              {
                icon: Trash2,
                label: 'Remove all shortcuts',
                danger: true,
                onSelect: () => setConfirmClear(true),
              },
            ]}
          />
        </div>
      </div>

      {demo && favorites.length > 0 && (
        <p className="mb-3 flex items-center gap-1.5 text-xs text-faint">
          <Info size={13} />
          Starter shortcuts — add your own, or remove these anytime.
        </p>
      )}

      {categories.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Filter by category">
          <button
            role="tab"
            aria-selected={filter === null}
            onClick={() => setFilter(null)}
            className={`chip cursor-pointer transition-colors duration-150 ${
              filter === null ? 'border-accent/50 bg-accent-soft text-accent' : 'hover:text-ink'
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={filter === c}
              onClick={() => setFilter(filter === c ? null : c)}
              className={`chip cursor-pointer transition-colors duration-150 ${
                filter === c ? 'border-accent/50 bg-accent-soft text-accent' : 'hover:text-ink'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {favorites.length === 0 ? (
        <div className="panel flex flex-col items-center gap-1.5 px-6 py-12 text-center">
          <Logo size={56} />
          <p className="mt-3 text-sm font-medium text-ink">Make it yours</p>
          <p className="max-w-sm text-xs leading-relaxed text-faint">
            Add the sites you visit most — they stay on this device, in your browser's local storage.
          </p>
          <div className="mt-3 flex gap-2">
            <Button variant="primary" size="sm" onClick={() => setFormOpen(true)}>
              <Plus size={14} />
              Add your first shortcut
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setConfirmRestore(true)}>
              <RotateCcw size={14} />
              Restore examples
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={`grid grid-cols-3 min-[420px]:grid-cols-4 sm:grid-cols-6 md:grid-cols-8 ${
            compact ? 'gap-2.5' : 'gap-4'
          }`}
        >
          {visible.map((fav, i) => (
            <FavoriteCard
              key={fav.id}
              fav={fav}
              index={i}
              canMoveUp={i > 0}
              canMoveDown={i < visible.length - 1}
              reorderDisabled={filter !== null}
              compact={compact}
            />
          ))}
          <button
            onClick={() => setFormOpen(true)}
            className={`flex flex-col items-center rounded-2xl border border-dashed border-line-strong text-faint transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/50 hover:text-accent ${
              compact ? 'gap-1.5 px-2 pb-2 pt-3' : 'gap-2 px-2 pb-3 pt-4'
            }`}
          >
            <span
              className={`flex items-center justify-center ${compact ? 'size-10 rounded-[11px]' : 'size-12 rounded-xl'}`}
            >
              <Plus size={compact ? 18 : 20} />
            </span>
            <span className="text-xs">Add</span>
          </button>
        </div>
      )}

      <FavoriteForm open={formOpen} onClose={() => setFormOpen(false)} />

      <ConfirmDialog
        open={confirmRestore}
        onClose={() => setConfirmRestore(false)}
        onConfirm={() => {
          restoreExamples()
          push('Starter shortcuts restored')
        }}
        title="Restore starter shortcuts"
        message="This replaces your current shortcuts with the Velora starter set. Export first if you want to keep them."
        confirmLabel="Restore"
      />
      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => {
          setFavorites([])
          push('All shortcuts removed')
        }}
        title="Remove all shortcuts"
        message={`This removes all ${favorites.length} shortcuts from this browser. Export first if you want to keep them.`}
        confirmLabel="Remove all"
      />
    </div>
  )
}
