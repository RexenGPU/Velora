import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, type LucideIcon } from 'lucide-react'
import { useClickOutside } from '@/hooks/useClickOutside'

export interface MenuItem {
  icon?: LucideIcon
  label?: string
  description?: string
  onSelect?: () => void
  danger?: boolean
  disabled?: boolean
  separator?: boolean
}

interface DropdownMenuProps {
  trigger: ReactNode
  items: MenuItem[]
  align?: 'start' | 'end'
  label: string
}

export function DropdownMenu({ trigger, items, align = 'end', label }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  useClickOutside(rootRef, () => setOpen(false), open)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const items = Array.from(
          rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? [],
        )
        const idx = items.indexOf(document.activeElement as HTMLElement)
        const delta = e.key === 'ArrowDown' ? 1 : -1
        const next = items[(idx + delta + items.length) % items.length]
        next?.focus()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-muted transition-colors duration-150 hover:bg-raised hover:text-ink"
      >
        {trigger}
        <ChevronDown size={13} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -2 }}
            transition={{ duration: 0.13 }}
            className={`panel absolute z-50 mt-2 min-w-44 p-1.5 ${align === 'end' ? 'right-0' : 'left-0'}`}
          >
            {items.map((item, i) =>
              item.separator ? (
                <div key={`sep-${i}`} className="my-1.5 h-px bg-line" />
              ) : (
                <button
                  key={item.label ?? i}
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    item.onSelect?.()
                    setOpen(false)
                  }}
                  className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors duration-100 disabled:opacity-40 ${
                    item.danger
                      ? 'text-rose-500 hover:bg-rose-500/10'
                      : 'text-ink hover:bg-raised'
                  }`}
                >
                  {item.icon && <item.icon size={14} className="mt-0.5 shrink-0" />}
                  <span className="min-w-0">
                    <span className="block font-medium">{item.label}</span>
                    {item.description && (
                      <span className="mt-0.5 block text-xs leading-snug text-faint">
                        {item.description}
                      </span>
                    )}
                  </span>
                </button>
              ),
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
