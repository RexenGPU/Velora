import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CircleAlert, CircleCheck, Info } from 'lucide-react'

type ToastKind = 'ok' | 'error' | 'info'

interface ToastItem {
  id: number
  kind: ToastKind
  message: string
}

interface ToastApi {
  push: (message: string, kind?: ToastKind) => void
}

const ToastCtx = createContext<ToastApi>({ push: () => {} })

let counter = 0

const icons: Record<ToastKind, typeof CircleCheck> = {
  ok: CircleCheck,
  error: CircleAlert,
  info: Info,
}

const iconColors: Record<ToastKind, string> = {
  ok: 'text-emerald-500',
  error: 'text-rose-500',
  info: 'text-accent',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const push = useCallback((message: string, kind: ToastKind = 'ok') => {
    const id = ++counter
    setItems((prev) => [...prev.slice(-3), { id, kind, message }])
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id))
    }, 3800)
  }, [])

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 left-1/2 z-[70] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4"
      >
        <AnimatePresence>
          {items.map((t) => {
            const Icon = icons[t.kind]
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.16 }}
                className="panel pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 text-sm"
              >
                <Icon size={15} className={iconColors[t.kind]} />
                <span className="text-ink">{t.message}</span>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast(): ToastApi {
  return useContext(ToastCtx)
}
