import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { motion } from 'motion/react'

interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: ReactNode
}

interface SegmentedProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  ariaLabel: string
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: SegmentedProps<T>) {
  const id = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    const idx = options.findIndex((o) => o.value === value)
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1
    const next = options[(idx + delta + options.length) % options.length]
    onChange(next.value)
    refs.current[options.indexOf(next)]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className="inline-flex items-center gap-0.5 rounded-lg border border-line bg-raised p-0.5"
    >
      {options.map((o, i) => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className="relative h-8 rounded-md px-3 text-sm font-medium"
          >
            {selected && (
              <motion.span
                layoutId={`seg-${id}`}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                className="absolute inset-0 rounded-md border border-line-strong bg-surface shadow-sm"
              />
            )}
            <span
              className={`relative z-10 inline-flex items-center gap-1.5 ${
                selected ? 'text-ink' : 'text-muted'
              }`}
            >
              {o.icon}
              {o.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
