import type { ReactNode } from 'react'

interface PanelProps {
  title?: string
  icon?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function Panel({ title, icon, action, children, className = '' }: PanelProps) {
  return (
    <section className={`panel p-5 ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">
            {icon && (
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                {icon}
              </span>
            )}
            {title}
          </h3>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}
