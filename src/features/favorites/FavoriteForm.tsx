import { useMemo, useState, type FormEvent } from 'react'
import { Check, Link2 } from 'lucide-react'
import type { Favorite } from '@/types'
import { useStore } from '@/lib/store'
import { normalizeUrlToString } from '@/lib/url'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

interface FavoriteFormProps {
  open: boolean
  onClose: () => void
  initial?: Favorite
}

export function FavoriteForm({ open, onClose, initial }: FavoriteFormProps) {
  const { addFavorite, updateFavorite, favorites } = useStore()
  const { push } = useToast()

  const [name, setName] = useState(initial?.name ?? '')
  const [url, setUrl] = useState(initial?.url ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [touched, setTouched] = useState(false)

  const existingCategories = useMemo(
    () => Array.from(new Set(favorites.map((f) => f.category).filter(Boolean))) as string[],
    [favorites],
  )

  const normalized = useMemo(() => (url.trim() ? normalizeUrlToString(url) : null), [url])
  const nameValid = name.trim().length > 0
  const urlValid = normalized !== null
  const showUrlError = touched && url.trim().length > 0 && !urlValid

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!nameValid || !urlValid) return

    const payload = {
      name: name.trim(),
      url: normalized as string,
      icon: icon.trim() || undefined,
      category: category.trim() || undefined,
    }
    if (initial) {
      updateFavorite(initial.id, payload)
      push('Shortcut updated')
    } else {
      addFavorite(payload)
      push('Shortcut added')
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit shortcut' : 'Add shortcut'}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fav-name" className="text-xs font-medium text-faint">
            Name
          </label>
          <input
            id="fav-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Example"
            maxLength={64}
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fav-url" className="text-xs font-medium text-faint">
            URL
          </label>
          <input
            id="fav-url"
            className="input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="example.com or https://example.com"
            inputMode="url"
            autoComplete="off"
          />
          {showUrlError ? (
            <p className="text-xs text-rose-500">
              That doesn't look like a valid web address — try a full URL like https://example.com.
            </p>
          ) : normalized ? (
            <p className="flex items-center gap-1.5 break-all text-xs text-faint">
              <Link2 size={12} className="shrink-0" />
              {normalized}
            </p>
          ) : (
            <p className="text-xs text-faint">https:// is added automatically if omitted.</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fav-icon" className="text-xs font-medium text-faint">
              Icon <span className="font-normal">(optional)</span>
            </label>
            <input
              id="fav-icon"
              className="input"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="🙂 or A"
              maxLength={8}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fav-category" className="text-xs font-medium text-faint">
              Category <span className="font-normal">(optional)</span>
            </label>
            <input
              id="fav-category"
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. News"
              list="velora-category-suggestions"
              maxLength={24}
            />
            <datalist id="velora-category-suggestions">
              {existingCategories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        </div>
        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-xs text-faint">
            <Check size={13} className="text-emerald-500" />
            Leave the icon empty to use the site's own logo — or set an emoji or letter yourself.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {initial ? 'Save' : 'Add'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
