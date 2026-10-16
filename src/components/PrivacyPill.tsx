import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight, ShieldCheck } from 'lucide-react'
import { useClickOutside } from '@/hooks/useClickOutside'

export function PrivacyPill() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  useClickOutside(rootRef, () => setOpen(false), open)

  return (
    <div ref={rootRef} className="relative hidden md:block">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="chip transition-colors duration-150 hover:border-accent/50 hover:text-accent"
      >
        <ShieldCheck size={13} className="text-accent" />
        Local-only
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -2 }}
            transition={{ duration: 0.13 }}
            className="panel absolute right-0 z-50 mt-2 w-72 p-3.5"
          >
            <p className="text-sm font-medium text-ink">How Velora handles data</p>
            <ul className="mt-2 flex flex-col gap-1.5 text-[13px] leading-relaxed text-muted">
              <li>
                · Favorites, settings and checklist progress stay in this browser (localStorage).
              </li>
              <li>· Searches go directly to your chosen engine — Velora doesn't proxy them.</li>
              <li>· No analytics, no accounts, no third-party scripts.</li>
            </ul>
            <a
              href="#/tools"
              onClick={() => setOpen(false)}
              className="mt-2.5 inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:text-accent-strong"
            >
              Open privacy tools
              <ArrowUpRight size={13} />
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
