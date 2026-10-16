import { useEffect, useId, useRef, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { trapTab } from '@/lib/focus'
import { IconButton } from '@/components/ui/IconButton'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'md' | 'lg'
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    restoreRef.current = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current
      if (!panel) return
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
      )
      ;(focusable[0] ?? panel).focus()
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
          <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              tabIndex={-1}
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className={`panel pointer-events-auto flex max-h-[85dvh] w-full flex-col overflow-hidden sm:rounded-2xl ${
                size === 'lg' ? 'sm:max-w-lg' : 'sm:max-w-md'
              }`}
            >
              <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
                <h2 id={titleId} className="text-[15px] font-semibold tracking-tight">
                  {title}
                </h2>
                <IconButton label="Close" size="sm" onClick={onClose}>
                  <X size={16} />
                </IconButton>
              </header>
              <div className="overflow-y-auto px-5 py-4">{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
