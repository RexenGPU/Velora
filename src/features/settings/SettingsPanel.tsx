import { useEffect, useRef, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { trapTab } from '@/lib/focus'
import { IconButton } from '@/components/ui/IconButton'

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
  children: ReactNode
}

export function SettingsPanel({ open, onClose, children }: SettingsPanelProps) {
  const panelRef = useRef<HTMLElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    restoreRef.current = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const raf = requestAnimationFrame(() => {
      panelRef.current?.focus()
    })

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      } else if (e.key === 'Tab') {
        trapTab(e, panelRef.current)
      }
    }
    document.addEventListener('keydown', onKey, true)

    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey, true)
      cancelAnimationFrame(raf)
      restoreRef.current?.focus?.()
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px]"
          />
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            tabIndex={-1}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-line bg-surface outline-none"
          >
            <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h2 className="text-[15px] font-semibold tracking-tight">Settings</h2>
              <IconButton label="Close settings" size="sm" onClick={onClose}>
                <X size={16} />
              </IconButton>
            </header>
            <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

export function SettingsSection({
  title,
  icon,
  children,
}: {
  title: string
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3.5 border-b border-line py-5 first:pt-0 last:border-b-0 last:pb-0">
      <h3 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">
        {icon && (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
            {icon}
          </span>
        )}
        {title}
      </h3>
      {children}
    </section>
  )
}

export function SettingsRow({
  label,
  hint,
  control,
}: {
  label: string
  hint?: string
  control: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{label}</p>
        {hint && <p className="mt-0.5 text-xs leading-snug text-faint">{hint}</p>}
      </div>
      {control}
    </div>
  )
}
