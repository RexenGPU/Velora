import { useMemo, useState, type FormEvent } from 'react'
import { Check, Eye, EyeOff, Lock, RefreshCcw } from 'lucide-react'
import type { VaultItem } from '@/types'
import { generatePassword } from '@/lib/crypto'
import { normalizeUrlToString } from '@/lib/url'
import { newId } from '@/lib/favorites'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface VaultItemFormProps {
  open: boolean
  onClose: () => void
  initial?: VaultItem
  onSave: (item: VaultItem) => Promise<void>
}

const LENGTHS = [12, 16, 20, 24].map((n) => ({ value: String(n), label: `${n} chars` }))

export function VaultItemForm({ open, onClose, initial, onSave }: VaultItemFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [url, setUrl] = useState(initial?.url ?? '')
  const [username, setUsername] = useState(initial?.username ?? '')
  const [password, setPassword] = useState(initial?.password ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [autoLogin, setAutoLogin] = useState(initial?.autoLogin ?? false)
  const [showPassword, setShowPassword] = useState(false)
  const [genLength, setGenLength] = useState('16')
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)

  const urlValid = url.trim() === '' || normalizeUrlToString(url) !== null
  const valid = name.trim().length > 0 && username.trim().length > 0 && password.length > 0 && urlValid
  const showUrlError = touched && url.trim().length > 0 && !urlValid

  const normalized = useMemo(() => (url.trim() ? normalizeUrlToString(url) : null), [url])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!valid) return
    setSaving(true)
    try {
      await onSave({
        id: initial?.id ?? newId(),
        name: name.trim(),
        url: normalized ?? '',
        username: username.trim(),
        password,
        notes: notes.trim() || undefined,
        autoLogin: autoLogin || undefined,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit entry' : 'Add password'}>
      <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-3.5" noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="vault-name" className="text-xs font-medium text-faint">
            Name <span className="text-rose-500">*</span>
          </label>
          <input
            id="vault-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Example — email"
            maxLength={64}
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="vault-url" className="text-xs font-medium text-faint">
            Website <span className="font-normal">(optional)</span>
          </label>
          <input
            id="vault-url"
            className="input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="example.com"
            inputMode="url"
            autoComplete="off"
          />
          {showUrlError && (
            <p className="text-xs text-rose-500">That doesn't look like a valid address.</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="vault-user" className="text-xs font-medium text-faint">
            Username or email <span className="text-rose-500">*</span>
          </label>
          <input
            id="vault-user"
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="you@example.com"
            autoComplete="off"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="vault-pass" className="text-xs font-medium text-faint">
            Password <span className="text-rose-500">*</span>
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                id="vault-pass"
                className="input pr-9 font-mono"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-faint transition-colors hover:text-ink"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <div className="w-28">
              <select
                aria-label="Generated password length"
                className="input"
                value={genLength}
                onChange={(e) => setGenLength(e.target.value)}
              >
                {LENGTHS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="secondary"
              type="button"
              onClick={() => setPassword(generatePassword(Number(genLength)))}
              title="Generate a cryptographically random password"
            >
              <RefreshCcw size={14} />
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="vault-notes" className="text-xs font-medium text-faint">
            Notes <span className="font-normal">(optional, encrypted too)</span>
          </label>
          <textarea
            id="vault-notes"
            className="input h-20 resize-none py-2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Recovery codes, security question…"
            maxLength={500}
          />
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-raised/40 px-3 py-2.5">
          <input
            type="checkbox"
            checked={autoLogin}
            onChange={(e) => setAutoLogin(e.target.checked)}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors duration-150 ${
              autoLogin ? 'border-accent bg-accent text-on-accent' : 'border-line-strong bg-surface'
            }`}
          >
            {autoLogin && <Check size={11} strokeWidth={3} />}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-ink">Auto-login on this site</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-faint">
              While the vault is unlocked, Velora fills the login form on matching pages and submits
              it. Works best on simple login forms — always check the result.
            </span>
          </span>
        </label>
        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-xs text-faint">
            <Lock size={12} className="text-accent" />
            Encrypted with your master password before it touches storage.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : initial ? 'Save' : 'Add'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
