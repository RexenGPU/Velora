import { useStore } from '@/lib/store'
import { useClock } from '@/hooks/useClock'
import { formatClockParts, formatDate, greeting } from '@/lib/format'

export function Clock() {
  const { settings } = useStore()
  const c = settings.clock
  const now = useClock(1000)

  if (!c.visible) return null

  const parts = formatClockParts(now, c.format, c.showSeconds)

  return (
    <div className="select-none text-center">
      <p className="text-sm font-medium text-muted">{greeting(now)}</p>
      <p className="mt-1.5 text-5xl font-medium leading-none tracking-tight tabular-nums text-ink sm:text-6xl md:text-7xl">
        {parts.map((part, i) => {
          if (part.type === 'second') return <span key={i} className="text-accent">{part.value}</span>
          if (part.type === 'dayPeriod') return <span key={i} className="text-[0.42em] font-medium tracking-wide text-faint">{part.value}</span>
          if (part.type === 'literal' && parts[i + 1]?.type === 'dayPeriod') return null
          return <span key={i}>{part.value}</span>
        })}
      </p>
      {c.showDate && <p className="mt-3 text-sm text-faint sm:text-base">{formatDate(now)}</p>}
    </div>
  )
}
