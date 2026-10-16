import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { ClockSettings, Favorite, HistoryKind, Settings, SettingsPatch, VaultItem, VaultStore } from '@/types'
import { loadStore, saveStore, wipeStore, type PersistedStore } from '@/lib/storage'
import { DEFAULT_FAVORITES, newId } from '@/lib/favorites'
import { createBackup, serializeBackup } from '@/lib/export'
import { PBKDF2_ITERATIONS, HISTORY_LIMIT, VAULT_CHECK } from '@/lib/app'
import { decryptJson, deriveKey, encryptJson, fromB64, randomBytes, toB64 } from '@/lib/crypto'

export interface StoreApi {
  settings: Settings
  favorites: Favorite[]
  checklist: Record<string, boolean>
  demo: boolean
  vault: VaultStore | null
  vaultKey: CryptoKey | null
  history: import('@/types').HistoryEntry[]
  setSettings: (patch: SettingsPatch) => void
  updateClock: (patch: Partial<ClockSettings>) => void
  addFavorite: (f: Omit<Favorite, 'id'>) => void
  updateFavorite: (id: string, patch: Partial<Omit<Favorite, 'id'>>) => void
  removeFavorite: (id: string) => void
  moveFavorite: (id: string, dir: -1 | 1) => void
  setFavorites: (favorites: Favorite[]) => void
  mergeFavorites: (incoming: Favorite[]) => { added: number; skipped: number }
  restoreExamples: () => void
  setChecklistItem: (id: string, value: boolean) => void
  exportToFile: () => void
  wipeAll: () => void
  /* Vault */
  createVault: (masterPassword: string) => Promise<void>
  unlockVault: (masterPassword: string) => Promise<boolean>
  lockVault: () => void
  resetVault: () => void
  saveVaultItem: (item: VaultItem) => Promise<void>
  removeVaultItem: (id: string) => void
  changeVaultPassword: (masterPassword: string) => Promise<void>
  /* History */
  recordHistory: (kind: HistoryKind, title: string, url: string) => void
  removeHistoryEntry: (id: string) => void
  clearHistory: () => void
}

const StoreCtx = createContext<StoreApi | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedStore>(() => loadStore())
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null)
  const stateRef = useRef(state)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    saveStore(state)
  }, [state])

  const api = useMemo<StoreApi>(() => {
    const markEdited = (s: PersistedStore): PersistedStore => ({ ...s, demo: false })

    /** Commit the next store synchronously (survives page unload) and update React. */
    const commitSync = (next: PersistedStore) => {
      stateRef.current = next
      saveStore(next)
      setState(next)
    }

    return {
      settings: state.settings,
      favorites: state.favorites,
      checklist: state.checklist,
      demo: state.demo,
      vault: state.vault,
      vaultKey,
      history: state.history,

      setSettings: (patch) =>
        setState((s) => ({
          ...s,
          settings: { ...s.settings, ...patch, clock: { ...s.settings.clock, ...(patch.clock ?? {}) } },
        })),

      updateClock: (patch) =>
        setState((s) => ({
          ...s,
          settings: { ...s.settings, clock: { ...s.settings.clock, ...patch } },
        })),

      addFavorite: (f) =>
        setState((s) => markEdited({ ...s, favorites: [...s.favorites, { ...f, id: newId() }] })),

      updateFavorite: (id, patch) =>
        setState((s) =>
          markEdited({
            ...s,
            favorites: s.favorites.map((f) => (f.id === id ? { ...f, ...patch } : f)),
          }),
        ),

      removeFavorite: (id) =>
        setState((s) => markEdited({ ...s, favorites: s.favorites.filter((f) => f.id !== id) })),

      moveFavorite: (id, dir) =>
        setState((s) => {
          const idx = s.favorites.findIndex((f) => f.id === id)
          const target = idx + dir
          if (idx < 0 || target < 0 || target >= s.favorites.length) return s
          const next = [...s.favorites]
          const [item] = next.splice(idx, 1)
          next.splice(target, 0, item)
          return markEdited({ ...s, favorites: next })
        }),

      setFavorites: (favorites) => setState((s) => markEdited({ ...s, favorites })),

      mergeFavorites: (incoming) => {
        const existing = new Set(state.favorites.map((f) => f.url))
        const fresh = incoming.filter((f) => !existing.has(f.url))
        setState((s) => markEdited({ ...s, favorites: [...s.favorites, ...fresh] }))
        return { added: fresh.length, skipped: incoming.length - fresh.length }
      },

      restoreExamples: () =>
        setState((s) => ({ ...s, demo: true, favorites: DEFAULT_FAVORITES.map((f) => ({ ...f })) })),

      setChecklistItem: (id, value) =>
        setState((s) => ({ ...s, checklist: { ...s.checklist, [id]: value } })),

      exportToFile: () => {
        const backup = createBackup({
          favorites: state.favorites,
          settings: state.settings,
          checklist: state.checklist,
        })
        const blob = new Blob([serializeBackup(backup)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        const stamp = new Date().toISOString().slice(0, 10)
        a.href = url
        a.download = `velora-backup-${stamp}.json`
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      },

      wipeAll: () => {
        wipeStore()
        window.location.reload()
      },

      /* ---------- Vault ---------- */

      createVault: async (masterPassword) => {
        const salt = randomBytes(16)
        const key = await deriveKey(masterPassword, salt, PBKDF2_ITERATIONS)
        const verifier = await encryptJson(key, VAULT_CHECK)
        const vault: VaultStore = {
          salt: toB64(salt),
          iterations: PBKDF2_ITERATIONS,
          verifier,
          entries: [],
        }
        commitSync({ ...stateRef.current, vault })
        setVaultKey(key)
      },

      unlockVault: async (masterPassword) => {
        const v = stateRef.current.vault
        if (!v) return false
        let key: CryptoKey
        try {
          key = await deriveKey(masterPassword, fromB64(v.salt), v.iterations)
          const check = await decryptJson<string>(key, v.verifier.iv, v.verifier.data)
          if (check !== VAULT_CHECK) return false
        } catch {
          return false
        }
        setVaultKey(key)
        return true
      },

      lockVault: () => setVaultKey(null),

      resetVault: () => {
        setVaultKey(null)
        commitSync({ ...stateRef.current, vault: null })
      },

      saveVaultItem: async (item) => {
        const key = vaultKey
        const v = stateRef.current.vault
        if (!key || !v) throw new Error('Vault is locked')
        const { iv, data } = await encryptJson(key, item)
        const entry = { id: item.id, iv, data }
        const exists = v.entries.some((e) => e.id === item.id)
        const entries = exists
          ? v.entries.map((e) => (e.id === item.id ? entry : e))
          : [...v.entries, entry]
        commitSync({ ...stateRef.current, vault: { ...v, entries } })
      },

      removeVaultItem: (id) => {
        const v = stateRef.current.vault
        if (!v) return
        commitSync({ ...stateRef.current, vault: { ...v, entries: v.entries.filter((e) => e.id !== id) } })
      },

      changeVaultPassword: async (masterPassword) => {
        const key = vaultKey
        const v = stateRef.current.vault
        if (!key || !v) throw new Error('Vault is locked')
        const items: VaultItem[] = []
        for (const e of v.entries) items.push(await decryptJson<VaultItem>(key, e.iv, e.data))
        const salt = randomBytes(16)
        const newKey = await deriveKey(masterPassword, salt, PBKDF2_ITERATIONS)
        const verifier = await encryptJson(newKey, VAULT_CHECK)
        const entries = []
        for (const item of items) {
          const { iv, data } = await encryptJson(newKey, item)
          entries.push({ id: item.id, iv, data })
        }
        commitSync({
          ...stateRef.current,
          vault: { salt: toB64(salt), iterations: PBKDF2_ITERATIONS, verifier, entries },
        })
        setVaultKey(newKey)
      },

      /* ---------- History ---------- */

      recordHistory: (kind, title, url) => {
        const s = stateRef.current
        if (!s.settings.historyEnabled) return
        const entry = {
          id: newId(),
          kind,
          title: title.trim().slice(0, 120),
          url,
          at: Date.now(),
        }
        const history = [entry, ...s.history].slice(0, HISTORY_LIMIT)
        commitSync({ ...s, history })
      },

      removeHistoryEntry: (id) =>
        setState((s) => ({ ...s, history: s.history.filter((h) => h.id !== id) })),

      clearHistory: () => setState((s) => ({ ...s, history: [] })),
    }
  }, [state, vaultKey])

  return <StoreCtx.Provider value={api}>{children}</StoreCtx.Provider>
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
