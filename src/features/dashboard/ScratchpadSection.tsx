import { useEffect, useRef, useState } from 'react'
import { Plus, StickyNote as StickyIcon, X } from 'lucide-react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/Button'

/**
 * Local sticky notes — persisted with the rest of the store.
 * Edits are committed with a short debounce so typing stays smooth.
 */
export function ScratchpadSection() {
  const { scratchpad, addNote, updateNote, removeNote } = useStore()
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const draftsRef = useRef(drafts)
  draftsRef.current = drafts
  const timers = useRef<Record<string, number>>({})

  const flush = (id: string) => {
    const text = draftsRef.current[id]
    if (text !== undefined) {
      updateNote(id, text)
      setDrafts((d) => {
        const next = { ...d }
        delete next[id]
        draftsRef.current = next
        return next
      })
    }
    if (timers.current[id]) {
      window.clearTimeout(timers.current[id])
      delete timers.current[id]
    }
  }

  // Commit any pending edits when leaving the dashboard.
  useEffect(() => {
    return () => {
      for (const id of Object.keys(draftsRef.current)) {
        const text = draftsRef.current[id]
        if (text !== undefined) updateNote(id, text)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onEdit = (id: string, text: string) => {
    setDrafts((d) => {
      const next = { ...d, [id]: text }
      draftsRef.current = next
      return next
    })
    if (timers.current[id]) window.clearTimeout(timers.current[id])
    timers.current[id] = window.setTimeout(() => flush(id), 550)
  }

  return (
    <div className="w-full">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">
          Scratchpad
        </h2>
        <span className="chip">{scratchpad.length}/12</span>
        <div className="ml-auto">
          <Button variant="secondary" size="sm" onClick={addNote} disabled={scratchpad.length >= 12}>
            <Plus size={14} />
            Add note
          </Button>
        </div>
      </div>

      {scratchpad.length === 0 ? (
        <div className="panel flex flex-col items-center gap-2.5 px-6 py-8 text-center">
          <StickyIcon size={20} className="text-faint" />
          <p className="text-sm text-muted">Quick notes for this device</p>
          <p className="max-w-sm text-xs leading-relaxed text-faint">
            Anything you jot down is stored locally with the rest of your Velora data — never
            uploaded.
          </p>
          <Button variant="primary" size="sm" onClick={addNote}>
            <Plus size={14} />
            Add your first note
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {scratchpad.map((note) => (
            <div key={note.id} className="panel group relative overflow-hidden p-3">
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-accent to-accent-strong opacity-70"
              />
              <textarea
                value={drafts[note.id] ?? note.text}
                onChange={(e) => onEdit(note.id, e.target.value)}
                onBlur={() => flush(note.id)}
                placeholder="Write something…"
                maxLength={2000}
                aria-label="Note"
                className="h-28 w-full resize-none bg-transparent pr-6 text-sm leading-relaxed text-ink outline-none placeholder:text-faint"
              />
              <button
                onClick={() => {
                  flush(note.id)
                  removeNote(note.id)
                }}
                aria-label="Delete note"
                className="absolute right-2.5 top-2.5 flex size-6 items-center justify-center rounded-md text-faint opacity-0 transition-opacity hover:bg-rose-500/10 hover:text-rose-500 focus-visible:opacity-100 group-hover:opacity-100"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
