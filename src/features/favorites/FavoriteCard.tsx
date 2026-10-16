import { useState } from 'react'
import { motion } from 'motion/react'
import { ArrowUpRight, ChevronDown, ChevronUp, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import type { Favorite } from '@/types'
import { useStore } from '@/lib/store'
import { colorIndexFor, hostnameOf } from '@/lib/favorites'
import { isIpHost, isPrivateHost } from '@/lib/url'
import { DropdownMenu } from '@/components/ui/DropdownMenu'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FavoriteForm } from '@/features/favorites/FavoriteForm'

interface FavoriteCardProps {
  fav: Favorite
  index: number
  canMoveUp: boolean
  canMoveDown: boolean
  reorderDisabled: boolean
  compact?: boolean
}

export function FavoriteCard({
  fav,
  index,
  canMoveUp,
  canMoveDown,
  reorderDisabled,
  compact = false,
}: FavoriteCardProps) {
  const { removeFavorite, moveFavorite, settings, recordHistory } = useStore()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [iconFailed, setIconFailed] = useState(false)

  const hue = colorIndexFor(fav.name)
  const host = hostnameOf(fav.url)
  const skipIcon = !host || isIpHost(host) || isPrivateHost(host)
  const showSiteIcon = settings.showSiteIcons && !iconFailed && !fav.icon && !skipIcon
  const iconSize = compact ? 22 : 28

  const tileCls = compact
    ? 'size-10 rounded-[11px] group-hover:scale-105'
    : 'size-12 rounded-xl group-hover:scale-105'
  const iconFallback = compact ? 14 : 15

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.3), duration: 0.25, ease: 'easeOut' }}
      className="group relative"
    >
      <a
        href={fav.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${fav.name}`}
        title={fav.url}
        onClick={() => recordHistory('shortcut', fav.name, fav.url)}
        className={`panel flex h-full flex-col items-center transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg ${
          compact ? 'gap-1.5 px-2 pb-2 pt-3' : 'gap-2 px-2 pb-3 pt-4'
        }`}
      >
        {fav.icon ? (
          <span className={`tile tile-emoji transition-transform duration-200 ${tileCls}`}>
            {fav.icon}
          </span>
        ) : showSiteIcon ? (
          <span className={`tile tile-emoji transition-transform duration-200 ${tileCls}`}>
            <img
              src={`https://icons.duckduckgo.com/ip3/${host}.ico`}
              alt=""
              width={iconSize}
              height={iconSize}
              loading="lazy"
              onError={() => setIconFailed(true)}
              className="rounded-[5px] object-contain"
            />
          </span>
        ) : (
          <span
            className={`tile tile-h-${hue} transition-transform duration-200 ${tileCls} ${compact ? 'text-[15px]' : 'text-lg'}`}
          >
            {fav.name.charAt(0).toUpperCase()}
          </span>
        )}
        <span className={`w-full truncate px-1 text-center text-muted ${compact ? 'text-[11px]' : 'text-xs'}`}>
          {fav.name}
        </span>
      </a>
      <div className="fav-menu absolute right-1.5 top-1.5">
        <DropdownMenu
          label={`Options for ${fav.name}`}
          trigger={
            <span className="inline-flex size-6.5 items-center justify-center rounded-md border border-line bg-surface text-faint shadow-sm">
              <MoreHorizontal size={iconFallback} />
            </span>
          }
          items={[
            {
              icon: ArrowUpRight,
              label: 'Open',
              onSelect: () => {
                recordHistory('shortcut', fav.name, fav.url)
                window.open(fav.url, '_blank', 'noopener,noreferrer')
              },
            },
            { icon: Pencil, label: 'Edit', onSelect: () => setEditOpen(true) },
            {
              icon: ChevronUp,
              label: 'Move up',
              disabled: !canMoveUp || reorderDisabled,
              onSelect: () => moveFavorite(fav.id, -1),
            },
            {
              icon: ChevronDown,
              label: 'Move down',
              disabled: !canMoveDown || reorderDisabled,
              onSelect: () => moveFavorite(fav.id, 1),
            },
            { separator: true },
            { icon: Trash2, label: 'Remove', danger: true, onSelect: () => setConfirmDelete(true) },
          ]}
        />
      </div>
      <FavoriteForm open={editOpen} onClose={() => setEditOpen(false)} initial={fav} />
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => removeFavorite(fav.id)}
        title="Remove shortcut"
        message={`Remove "${fav.name}" from your quick links? This only removes the shortcut — the site itself is unaffected.`}
        confirmLabel="Remove"
      />
    </motion.div>
  )
}
