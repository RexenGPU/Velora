import { useRef, useState } from 'react'
import { FileJson, Upload } from 'lucide-react'
import { useStore } from '@/lib/store'
import { parseBackup, type ParsedImport } from '@/lib/export'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

interface ImportDialogProps {
  open: boolean
  onClose: () => void
  data: ParsedImport | null
}

export function ImportDialog({ open, onClose, data }: ImportDialogProps) {
  const { mergeFavorites, setFavorites, setSettings, setChecklistItem } = useStore()
  const { push } = useToast()

  if (!data) return null

  const applySettings = (patch: ParsedImport['settings']) => {
    if (!patch) return
    setSettings(patch)
  }

  const onMerge = () => {
    const { added, skipped } = mergeFavorites(data.favorites)
    applySettings(data.settings)
    if (data.checklist) {
      for (const [k, v] of Object.entries(data.checklist)) setChecklistItem(k, v)
    }
    push(
      `Imported ${added} shortcut${added === 1 ? '' : 's'}${skipped ? ` (${skipped} duplicate${skipped === 1 ? '' : 's'} skipped)` : ''}`,
    )
    onClose()
  }

  const onReplace = () => {
    setFavorites(data.favorites)
    applySettings(data.settings)
    if (data.checklist) {
      for (const [k, v] of Object.entries(data.checklist)) setChecklistItem(k, v)
    }
    push('Backup restored — current data replaced')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Import backup">
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-2.5 rounded-lg border border-line bg-raised px-3 py-2.5 text-sm">
          <FileJson size={16} className="mt-0.5 shrink-0 text-accent" />
          <div className="text-muted">
            <p>
              <span className="font-medium text-ink">{data.favorites.length}</span> shortcut
              {data.favorites.length === 1 ? '' : 's'} found
              {data.skipped > 0 && (
                <span className="text-faint"> ({data.skipped} invalid or over limit skipped)</span>
              )}
            </p>
            {data.settings && <p className="mt-0.5 text-xs text-faint">Includes settings.</p>}
            {data.checklist && <p className="mt-0.5 text-xs text-faint">Includes checklist progress.</p>}
          </div>
        </div>
        <p className="text-xs leading-relaxed text-faint">
          <span className="font-medium text-muted">Merge</span> keeps your current shortcuts and adds
          new ones (duplicates by identical address are skipped).{' '}
          <span className="font-medium text-muted">Replace</span> overwrites everything with the
          backup's contents.
        </p>
        <div className="mt-1 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={onMerge}>
            <Upload size={14} />
            Merge
          </Button>
          <Button variant="primary" onClick={onReplace}>
            Replace
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/** Shared import/export controls used by the favorites section and settings. */
export function DataManager() {
  const { exportToFile } = useStore()
  const { push } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<ParsedImport | null>(null)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    const text = await file.text()
    const result = parseBackup(text)
    if (result.ok) {
      setPending(result.data)
    } else {
      push(result.message, 'error')
    }
  }

  return (
    <>
      <input
        id="velora-import-input"
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          void onFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload size={14} />
          Import
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            exportToFile()
            push('Backup downloaded')
          }}
        >
          <FileJson size={14} />
          Export
        </Button>
      </div>
      <ImportDialog open={pending !== null} onClose={() => setPending(null)} data={pending} />
    </>
  )
}
