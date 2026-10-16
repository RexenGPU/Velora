import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Copy,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LockOpen,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import type { VaultItem } from '@/types'
import { useStore } from '@/lib/store'
import { decryptJson } from '@/lib/crypto'
import { hostnameOf } from '@/lib/favorites'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DropdownMenu } from '@/components/ui/DropdownMenu'
import { Modal } from '@/components/ui/Modal'
import { VaultItemForm } from '@/features/vault/VaultItemForm'

export function VaultView() {
  const { vault, vaultKey, lockVault, resetVault, saveVaultItem, removeVaultItem, changeVaultPassword } =
    useStore()
  const { push } = useToast()

  const unlocked = !!vaultKey && !!vault
  const [items, setItems] = useState<VaultItem[] | null>(null)

  useEffect(() => {
    if (!vaultKey || !vault) {
      setItems(null)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const decrypted: VaultItem[] = []
        for (const e of vault.entries) {
          decrypted.push(await decryptJson<VaultItem>(vaultKey, e.iv, e.data))
        }
        if (!cancelled) setItems(decrypted)
      } catch {
        if (!cancelled) {
          setItems(null)
          push('An entry could not be decrypted', 'error')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [vaultKey, vault, push])

  if (!vault) return <CreateVaultScreen />
  if (!unlocked) return <UnlockVaultScreen />
  return (
    <VaultManager
      items={items ?? []}
      onLock={() => {
        lockVault()
        push('Vault locked')
      }}
      onReset={resetVault}
      onSave={saveVaultItem}
      onRemove={removeVaultItem}
      onChangePassword={changeVaultPassword}
    />
  )
}

/* ---------------- Create ---------------- */

function CreateVaultScreen() {
  const { createVault } = useStore()
  const { push } = useToast()
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (pw.length < 8) {
      setError('Use at least 8 characters — it protects everything below.')
      return
    }
    if (pw !== confirm) {
      setError('The two passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await createVault(pw)
      push('Vault created')
    } catch {
      push('Could not create the vault', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5 pt-14">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <KeyRound size={26} />
      </span>
      <div className="text-center">
        <h1 className="text-xl font-semibold tracking-tight">Create your vault</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          One master password encrypts everything with AES-GCM 256 (PBKDF2 key derivation). It is
          never stored and never leaves this device.
        </p>
      </div>
      <form onSubmit={(e) => void onSubmit(e)} className="panel flex w-full flex-col gap-3.5 p-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="master-new" className="text-xs font-medium text-faint">
            Master password
          </label>
          <div className="relative">
            <input
              id="master-new"
              className="input pr-9"
              type={show ? 'text' : 'password'}
              value={pw}
              onChange={(e) => {
                setPw(e.target.value)
                setError(null)
              }}
              autoComplete="new-password"
              autoFocus
            />
            <button
              type="button"
              aria-label={show ? 'Hide password' : 'Show password'}
              onClick={() => setShow((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-faint transition-colors hover:text-ink"
            >
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="master-confirm" className="text-xs font-medium text-faint">
            Confirm
          </label>
          <input
            id="master-confirm"
            className="input"
            type={show ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value)
              setError(null)
            }}
            autoComplete="new-password"
          />
        </div>
        {error && (
          <p role="alert" className="text-xs text-rose-500">
            {error}
          </p>
        )}
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2.5 text-xs leading-relaxed text-muted">
          <TriangleAlert size={14} className="mt-0.5 shrink-0 text-amber-500" />
          If you forget this password, the vault cannot be recovered — not by you, not by anyone.
          Export your passwords regularly once the vault has entries.
        </div>
        <Button variant="primary" type="submit" disabled={busy}>
          <Lock size={14} />
          {busy ? 'Deriving key…' : 'Create vault'}
        </Button>
      </form>
    </div>
  )
}

/* ---------------- Unlock ---------------- */

function UnlockVaultScreen() {
  const { unlockVault, resetVault } = useStore()
  const { push } = useToast()
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!pw) return
    setBusy(true)
    const ok = await unlockVault(pw)
    setBusy(false)
    if (!ok) {
      setError(true)
      setPw('')
      return
    }
    push('Vault unlocked')
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5 pt-14">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <LockOpen size={26} />
      </span>
      <div className="text-center">
        <h1 className="text-xl font-semibold tracking-tight">Vault locked</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          Enter your master password to decrypt your entries for this session. The key stays in
          memory only and is dropped on reload.
        </p>
      </div>
      <form onSubmit={(e) => void onSubmit(e)} className="panel flex w-full flex-col gap-3.5 p-5">
        <input
          className="input"
          type="password"
          value={pw}
          onChange={(e) => {
            setPw(e.target.value)
            setError(false)
          }}
          placeholder="Master password"
          autoComplete="current-password"
          autoFocus
          aria-label="Master password"
        />
        {error && (
          <p role="alert" className="text-xs text-rose-500">
            Wrong master password — decryption failed.
          </p>
        )}
        <Button variant="primary" type="submit" disabled={busy || !pw}>
          <Lock size={14} />
          {busy ? 'Deriving key…' : 'Unlock'}
        </Button>
        <button
          type="button"
          onClick={() => setConfirmReset(true)}
          className="mx-auto text-xs text-faint underline-offset-2 transition-colors hover:text-rose-500 hover:underline"
        >
          Forgot the password? Reset the vault
        </button>
      </form>
      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          resetVault()
          push('Vault deleted — a new one can be created', 'info')
        }}
        title="Reset vault"
        message="Without the master password the entries cannot be decrypted. Resetting permanently deletes the encrypted vault and every password it holds. This cannot be undone."
        confirmLabel="Delete vault"
      />
    </div>
  )
}

/* ---------------- Manager ---------------- */

interface VaultManagerProps {
  items: VaultItem[]
  onLock: () => void
  onReset: () => void
  onSave: (item: VaultItem) => Promise<void>
  onRemove: (id: string) => void
  onChangePassword: (pw: string) => Promise<void>
}

function VaultManager({ items, onLock, onReset, onSave, onRemove, onChangePassword }: VaultManagerProps) {
  const { push } = useToast()
  const [filter, setFilter] = useState('')
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [formOpen, setFormOpen] = useState<{ open: boolean; item?: VaultItem }>({ open: false })
  const [confirmDelete, setConfirmDelete] = useState<VaultItem | null>(null)
  const [confirmExport, setConfirmExport] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [changePwOpen, setChangePwOpen] = useState(false)
  const [newPw, setNewPw] = useState('')
  const [newPwConfirm, setNewPwConfirm] = useState('')
  const [changeError, setChangeError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.username.toLowerCase().includes(q) ||
        hostnameOf(i.url).includes(q),
    )
  }, [items, filter])

  const copy = (text: string, what: string) => {
    void navigator.clipboard?.writeText(text)
    push(`${what} copied`)
  }

  const exportClear = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      entries: items.map((i) => ({
        name: i.name,
        url: i.url,
        username: i.username,
        password: i.password,
        notes: i.notes ?? '',
      })),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `velora-passwords-${stamp}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    push('Password export downloaded')
  }

  const onChangePwSubmit = async () => {
    if (newPw.length < 8) {
      setChangeError('Use at least 8 characters.')
      return
    }
    if (newPw !== newPwConfirm) {
      setChangeError('The two passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await onChangePassword(newPw)
      setChangePwOpen(false)
      setNewPw('')
      setNewPwConfirm('')
      setChangeError(null)
      push('Master password changed')
    } catch {
      push('Could not change the password', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pt-8 md:pt-12">
      <header className="flex flex-wrap items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <KeyRound size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Password vault</h1>
          <p className="text-xs text-faint">
            {items.length} entr{items.length === 1 ? 'y' : 'ies'} · encrypted locally · unlocked for
            this session
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setFormOpen({ open: true })}>
          <Plus size={14} />
          Add
        </Button>
        <DropdownMenu
          label="Vault options"
          trigger={
            <span className="inline-flex size-8 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-raised hover:text-ink">
              <MoreHorizontal size={16} />
            </span>
          }
          items={[
            { icon: Lock, label: 'Lock vault', onSelect: onLock },
            { icon: Download, label: 'Export (clear text)', onSelect: () => setConfirmExport(true) },
            { icon: RefreshCcw, label: 'Change master password', onSelect: () => setChangePwOpen(true) },
            { separator: true },
            { icon: Trash2, label: 'Delete vault', danger: true, onSelect: () => setConfirmReset(true) },
          ]}
        />
      </header>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search name, username or site"
          aria-label="Search vault"
          className="input pl-9"
        />
      </div>

      {items.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 px-6 py-12 text-center">
          <p className="text-sm font-medium text-ink">No passwords yet</p>
          <p className="max-w-sm text-xs leading-relaxed text-faint">
            Add your first entry — it's encrypted with your master password before it ever touches
            storage.
          </p>
          <Button variant="primary" size="sm" onClick={() => setFormOpen({ open: true })}>
            <Plus size={14} />
            Add password
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((item) => {
            const isRevealed = revealed.has(item.id)
            const host = hostnameOf(item.url)
            return (
              <li key={item.id} className="panel flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <div className="min-w-0 flex-1 basis-48">
                  <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                  <p className="truncate text-xs text-faint">{host || 'No website'}</p>
                </div>
                <div className="flex min-w-0 flex-1 basis-40 items-center gap-1.5">
                  <span className="truncate font-mono text-xs text-muted">{item.username}</span>
                  <button
                    onClick={() => copy(item.username, 'Username')}
                    aria-label={`Copy username for ${item.name}`}
                    className="shrink-0 text-faint transition-colors hover:text-ink"
                  >
                    <Copy size={13} />
                  </button>
                </div>
                <div className="flex min-w-0 flex-1 basis-40 items-center gap-1.5">
                  <span className="truncate font-mono text-xs text-muted">
                    {isRevealed ? item.password : '••••••••••'}
                  </span>
                  <button
                    onClick={() =>
                      setRevealed((prev) => {
                        const next = new Set(prev)
                        if (next.has(item.id)) next.delete(item.id)
                        else next.add(item.id)
                        return next
                      })
                    }
                    aria-label={isRevealed ? `Hide password for ${item.name}` : `Show password for ${item.name}`}
                    className="shrink-0 text-faint transition-colors hover:text-ink"
                  >
                    {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                  <button
                    onClick={() => copy(item.password, 'Password')}
                    aria-label={`Copy password for ${item.name}`}
                    className="shrink-0 text-faint transition-colors hover:text-ink"
                  >
                    <Copy size={13} />
                  </button>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => setFormOpen({ open: true, item })}
                    aria-label={`Edit ${item.name}`}
                    className="flex size-7 items-center justify-center rounded-md text-faint transition-colors hover:bg-raised hover:text-ink"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(item)}
                    aria-label={`Remove ${item.name}`}
                    className="flex size-7 items-center justify-center rounded-md text-faint transition-colors hover:bg-rose-500/10 hover:text-rose-500"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            )
          })}
          {visible.length === 0 && (
            <li className="panel px-4 py-6 text-center text-sm text-faint">No entries match.</li>
          )}
        </ul>
      )}

      <p className="px-1 text-[11px] leading-relaxed text-faint">
        Encryption: AES-GCM 256-bit, key derived with PBKDF2-SHA256 (310,000 iterations). The master
        password is never stored — a forgotten one cannot be recovered. Velora is a local
        convenience vault, not a replacement for a dedicated password manager.
      </p>

      <VaultItemForm
        open={formOpen.open}
        onClose={() => setFormOpen({ open: false })}
        initial={formOpen.item}
        onSave={onSave}
      />

      <ConfirmDialog
        open={confirmExport}
        onClose={() => setConfirmExport(false)}
        onConfirm={exportClear}
        title="Export passwords"
        message="The exported file will contain your passwords in CLEAR TEXT, readable by anyone with access to it. Store it somewhere safe and delete it once you no longer need it."
        confirmLabel="Export anyway"
      />
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) onRemove(confirmDelete.id)
          push('Entry removed')
        }}
        title="Remove entry"
        message={`Remove "${confirmDelete?.name}" from the vault?`}
        confirmLabel="Remove"
      />
      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={onReset}
        title="Delete vault"
        message="This permanently deletes the encrypted vault and every password it holds. Export first if you want to keep them."
        confirmLabel="Delete vault"
      />

      <Modal open={changePwOpen} onClose={() => setChangePwOpen(false)} title="Change master password">
        <div className="flex flex-col gap-3.5">
          <p className="text-xs leading-relaxed text-muted">
            Every entry will be re-encrypted with the new password. Keep it safe — a forgotten one
            cannot be recovered.
          </p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="change-pw" className="text-xs font-medium text-faint">
              New master password
            </label>
            <input
              id="change-pw"
              className="input"
              type="password"
              value={newPw}
              onChange={(e) => {
                setNewPw(e.target.value)
                setChangeError(null)
              }}
              autoComplete="new-password"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="change-pw-2" className="text-xs font-medium text-faint">
              Confirm
            </label>
            <input
              id="change-pw-2"
              className="input"
              type="password"
              value={newPwConfirm}
              onChange={(e) => {
                setNewPwConfirm(e.target.value)
                setChangeError(null)
              }}
              autoComplete="new-password"
            />
          </div>
          {changeError && (
            <p role="alert" className="text-xs text-rose-500">
              {changeError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setChangePwOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={busy} onClick={() => void onChangePwSubmit()}>
              {busy ? 'Re-encrypting…' : 'Change password'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
