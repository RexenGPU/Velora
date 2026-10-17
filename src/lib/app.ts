export const APP_NAME = 'Velora'
export const APP_VERSION = '1.6.1'
export const STORAGE_KEY = 'velora:v1'
export const STORE_VERSION = 1
export const MAX_FAVORITES = 200
export const MAX_BACKUP_BYTES = 1_000_000
export const HISTORY_LIMIT = 500
export const PBKDF2_ITERATIONS = 310_000
export const VAULT_CHECK = 'velora-vault-verifier-v1'

/** True when running inside the Electron desktop shell (preload exposed the bridge). */
export const isElectron =
  typeof window !== 'undefined' && typeof window.veloraDesktop !== 'undefined'

declare global {
  interface Window {
    veloraDesktop?: {
      minimize: () => void
      maximize: () => void
      close: () => void
      /** Persist the store JSON to the app-data file (survives version upgrades). */
      saveStore: (json: string) => void
      /** Read the persisted store file, or null. */
      getStore: () => string | null
      /** Delete the persisted store file. */
      clearStore: () => void
      /** Provide decrypted credentials for auto-login on a tab (opt-in per entry). */
      sendAutologin: (tabId: string, payload: { username: string; password: string; submit: boolean }) => void
    }
  }
}
