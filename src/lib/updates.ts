import { useEffect, useState } from 'react'

export type UpdateStatusName =
  | 'idle'
  | 'checking'
  | 'available'
  | 'none'
  | 'downloading'
  | 'downloaded'
  | 'error'

export interface UpdateStatus {
  status: UpdateStatusName
  version?: string
  percent?: number
}

let current: UpdateStatus = { status: 'idle' }
const listeners = new Set<(status: UpdateStatus) => void>()

if (typeof window !== 'undefined') {
  window.addEventListener('velora:update', (e) => {
    const detail = (e as CustomEvent<UpdateStatus>).detail
    if (detail && typeof detail.status === 'string') {
      current = detail
      listeners.forEach((listener) => listener(current))
    }
  })
}

/** Subscribe to desktop auto-update status (idle on the web version). */
export function useUpdateStatus(): UpdateStatus {
  const [status, setStatus] = useState<UpdateStatus>(current)
  useEffect(() => {
    listeners.add(setStatus)
    return () => {
      listeners.delete(setStatus)
    }
  }, [])
  return status
}
