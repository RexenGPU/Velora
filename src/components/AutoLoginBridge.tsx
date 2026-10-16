import { useEffect } from 'react'
import type { VaultItem } from '@/types'
import { useStore } from '@/lib/store'
import { decryptJson } from '@/lib/crypto'

/**
 * Desktop bridge: when a tab finishes loading, the main process asks the app
 * for auto-login credentials. If the vault is unlocked and an entry matches
 * the host with autoLogin enabled, we decrypt it here (main never sees the
 * vault) and hand the credentials to that tab's webContents for form filling.
 */
export function AutoLoginBridge() {
  const { vault, vaultKey } = useStore()

  useEffect(() => {
    const api = window.veloraDesktop
    if (!api?.sendAutologin) return

    const handler = async (event: Event) => {
      const detail = (event as CustomEvent<{ tabId: string; host: string }>).detail
      if (!detail?.tabId || !detail.host || !vault || !vaultKey) return

      const matchHost = (a: string, b: string) => a === b || a.endsWith('.' + b) || b.endsWith('.' + a)
      for (const entry of vault.entries) {
        let item: VaultItem
        try {
          item = await decryptJson<VaultItem>(vaultKey, entry.iv, entry.data)
        } catch {
          continue
        }
        if (!item.autoLogin || !item.username || !item.password) continue
        let entryHost = ''
        try {
          entryHost = new URL(item.url).hostname
        } catch {
          continue
        }
        if (matchHost(entryHost, detail.host)) {
          api.sendAutologin?.(detail.tabId, {
            username: item.username,
            password: item.password,
            submit: true,
          })
          return
        }
      }
    }

    const listener = (e: Event) => void handler(e)
    window.addEventListener('velora:autologin', listener)
    return () => window.removeEventListener('velora:autologin', listener)
  }, [vault, vaultKey])

  return null
}
