import { useEffect, useState } from 'react'

/** Ticking clock. Returns the current time, updated every `intervalMs`. */
export function useClock(intervalMs = 1000): Date {
  const [now, setNow] = useState<Date>(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}
