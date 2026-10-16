import { useState } from 'react'
import {
  Bookmark,
  Clock as ClockIcon,
  Database,
  History as HistoryIcon,
  Info,
  Monitor,
  Moon,
  Rocket,
  Search as SearchIcon,
  SlidersHorizontal,
  Sun,
} from 'lucide-react'
import type { EngineId } from '@/types'
import { getEngineList, validCustomEngine } from '@/lib/engines'
import { normalizeUrlToString } from '@/lib/url'
import { useStore } from '@/lib/store'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Toggle } from '@/components/ui/Toggle'
import { Segmented } from '@/components/ui/Segmented'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ExternalLink } from '@/components/ui/ExternalLink'
import { DataManager } from '@/features/favorites/ImportDialog'
import { FavoriteForm } from '@/features/favorites/FavoriteForm'
import { APP_VERSION } from '@/lib/app'
import type { AccentId } from '@/types'
import { SettingsPanel, SettingsRow, SettingsSection } from '@/features/settings/SettingsPanel'

const ACCENTS: { id: AccentId; label: string; color: string }[] = [
  { id: 'blue', label: 'Blue', color: '#4da3ff' },
  { id: 'cyan', label: 'Cyan', color: '#2bd4e8' },
  { id: 'violet', label: 'Violet', color: '#9480ff' },
  { id: 'green', label: 'Green', color: '#3fd699' },
  { id: 'amber', label: 'Amber', color: '#f6b954' },
  { id: 'rose', label: 'Rose', color: '#f4788f' },
]

interface SettingsContentProps {
  open: boolean
  onClose: () => void
}

export function SettingsContent({ open, onClose }: SettingsContentProps) {
  const { settings, setSettings, updateClock, favorites, restoreExamples, wipeAll, history, clearHistory } = useStore()
  const { push } = useToast()
  const [confirmWipe, setConfirmWipe] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState(false)
  const [confirmClearHistory, setConfirmClearHistory] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [customName, setCustomName] = useState(settings.customEngine?.name ?? '')
  const [customTemplate, setCustomTemplate] = useState(settings.customEngine?.urlTemplate ?? '')
  const [customStartupDraft, setCustomStartupDraft] = useState(settings.startupUrl ?? '')

  const customDraft: { name: string; urlTemplate: string } | undefined = customName.trim() && customTemplate.includes('%s')
    ? { name: customName.trim(), urlTemplate: customTemplate.trim() }
    : undefined
  const customValid = customDraft ? validCustomEngine(customDraft) : false

  return (
    <SettingsPanel open={open} onClose={onClose}>
      <div className="flex flex-col gap-5">
        <SettingsSection title="Appearance" icon={<SlidersHorizontal size={13} />}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-ink">Theme</p>
              <Segmented
                ariaLabel="Theme"
                value={settings.theme}
                onChange={(theme) => setSettings({ theme })}
                options={[
                  { value: 'light', label: 'Light', icon: <Sun size={14} /> },
                  { value: 'dark', label: 'Dark', icon: <Moon size={14} /> },
                  { value: 'system', label: 'System', icon: <Monitor size={14} /> },
                ]}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-ink">Accent color</p>
                <p className="mt-0.5 text-xs text-faint">Used for highlights and focus rings.</p>
              </div>
              <div className="flex items-center gap-2" role="radiogroup" aria-label="Accent color">
                {ACCENTS.map((a) => (
                  <button
                    key={a.id}
                    role="radio"
                    aria-checked={settings.accent === a.id}
                    aria-label={a.label}
                    title={a.label}
                    onClick={() => setSettings({ accent: a.id })}
                    className={`size-7 rounded-full transition-transform duration-150 hover:scale-110 ${
                      settings.accent === a.id ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''
                    }`}
                    style={{ backgroundColor: a.color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-ink">Layout</p>
                <p className="mt-0.5 text-xs text-faint">Compact tightens spacing across the dashboard.</p>
              </div>
              <Segmented
                ariaLabel="Layout density"
                value={settings.layout}
                onChange={(layout) => setSettings({ layout })}
                options={[
                  { value: 'comfortable', label: 'Comfortable' },
                  { value: 'compact', label: 'Compact' },
                ]}
              />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="Clock & date" icon={<ClockIcon size={13} />}>
          <div className="flex flex-col gap-3.5">
            <SettingsRow
              label="Show clock"
              control={<Toggle checked={settings.clock.visible} onChange={(v) => updateClock({ visible: v })} label="Show clock" />}
            />
            <SettingsRow
              label="Time format"
              control={
                <Segmented
                  ariaLabel="Time format"
                  value={settings.clock.format}
                  onChange={(format) => updateClock({ format })}
                  options={[
                    { value: '12h', label: '12-hour' },
                    { value: '24h', label: '24-hour' },
                  ]}
                />
              }
            />
            <SettingsRow
              label="Show date"
              control={<Toggle checked={settings.clock.showDate} onChange={(v) => updateClock({ showDate: v })} label="Show date" />}
            />
            <SettingsRow
              label="Show seconds"
              control={<Toggle checked={settings.clock.showSeconds} onChange={(v) => updateClock({ showSeconds: v })} label="Show seconds" />}
            />
          </div>
        </SettingsSection>

        <SettingsSection title="Startup" icon={<Rocket size={13} />}>
          <div className="flex flex-col gap-3">
            <SettingsRow
              label="Open on launch"
              hint="Desktop app only."
              control={
                <Segmented
                  ariaLabel="Startup page"
                  value={settings.startupMode}
                  onChange={(v) => setSettings({ startupMode: v })}
                  options={[
                    { value: 'dashboard', label: 'Dashboard' },
                    { value: 'custom', label: 'Custom page' },
                  ]}
                />
              }
            />
            {settings.startupMode === 'custom' && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="startup-url" className="text-xs font-medium text-faint">
                  Startup URL
                </label>
                <input
                  id="startup-url"
                  className="input"
                  value={customStartupDraft}
                  onChange={(e) => setCustomStartupDraft(e.target.value)}
                  onBlur={() => {
                    const normalized = customStartupDraft.trim()
                      ? normalizeUrlToString(customStartupDraft)
                      : null
                    setSettings({ startupUrl: normalized ?? undefined })
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                  }}
                  placeholder="https://duckduckgo.com"
                  spellCheck={false}
                  inputMode="url"
                />
                <p className="text-xs leading-relaxed text-faint">
                  {settings.startupUrl
                    ? `Velora opens ${settings.startupUrl} in a tab on launch.`
                    : 'Enter a URL — with an empty field Velora falls back to the dashboard.'}
                </p>
              </div>
            )}
          </div>
        </SettingsSection>

        <SettingsSection title="Search" icon={<SearchIcon size={13} />}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-faint">Search engine</p>
              <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Search engine">
                {getEngineList(settings.customEngine).map((e) => {
                  const selected = settings.engine === e.id
                  return (
                    <label
                      key={e.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors duration-150 ${
                        selected ? 'border-accent/50 bg-accent-soft/50' : 'border-line bg-raised/40 hover:border-line-strong'
                      }`}
                    >
                      <input
                        type="radio"
                        name="search-engine"
                        checked={selected}
                        onChange={() => setSettings({ engine: e.id })}
                        className="sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                          selected ? 'border-accent' : 'border-line-strong'
                        }`}
                      >
                        {selected && <span className="size-2 rounded-full bg-accent" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-ink">{e.name}</span>
                        <span className="block text-xs text-faint">{e.tagline}</span>
                      </span>
                      {e.policyUrl && (
                        <ExternalLink href={e.policyUrl} ariaLabel={`${e.name} privacy policy`} className="shrink-0 text-xs">
                          Policy
                        </ExternalLink>
                      )}
                    </label>
                  )
                })}
              </div>
            </div>
            <div className="flex flex-col gap-2 rounded-lg border border-line bg-raised/40 px-3 py-3">
              <p className="text-xs font-medium text-muted">Custom engine</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="input"
                  aria-label="Custom engine name"
                  placeholder="My engine"
                  value={customName}
                  maxLength={32}
                  onChange={(e) => setCustomName(e.target.value)}
                  onBlur={() => {
                    if (customValid) setSettings({ customEngine: customDraft })
                  }}
                />
                <input
                  className="input"
                  aria-label="Custom engine URL template"
                  placeholder="https://site.com/search?q=%s"
                  value={customTemplate}
                  maxLength={512}
                  spellCheck={false}
                  onChange={(e) => setCustomTemplate(e.target.value)}
                  onBlur={() => {
                    if (customValid) setSettings({ customEngine: customDraft })
                  }}
                />
              </div>
              <p className={`text-xs leading-relaxed ${customTemplate && !customValid ? 'text-amber-500' : 'text-faint'}`}>
                {customTemplate && !customValid
                  ? 'The template needs to be a valid http(s) URL containing %s where the query goes.'
                  : 'Use %s where the query goes — e.g. https://search.mysite.com/?q=%s. Saved locally, sent nowhere.'}
              </p>
              {customValid && (
                <Button
                  variant={settings.engine === ('custom' as EngineId) ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={() =>
                    setSettings({
                      engine: settings.engine === 'custom' ? 'duckduckgo' : 'custom',
                      customEngine: customDraft,
                    })
                  }
                >
                  {settings.engine === 'custom' ? 'Deactivate as default' : 'Use as default engine'}
                </Button>
              )}
            </div>
            <SettingsRow
              label="Open results in a new tab"
              hint="Web version: results open in a new browser tab. Desktop app: browsing always happens inside the app window, with a toolbar to come back."
              control={
                <Toggle
                  checked={settings.searchInNewTab}
                  onChange={(v) => setSettings({ searchInNewTab: v })}
                  label="Open search results in a new tab"
                />
              }
            />
          </div>
        </SettingsSection>

        <SettingsSection title="History" icon={<HistoryIcon size={13} />}>
          <div className="flex flex-col gap-3">
            <SettingsRow
              label="Record history"
              hint="Off by default. When on, Velora logs the shortcuts, searches and addresses you open — locally only, capped at 500 entries, excluded from backups."
              control={
                <Toggle
                  checked={settings.historyEnabled}
                  onChange={(v) => setSettings({ historyEnabled: v })}
                  label="Record history"
                />
              }
            />
            {settings.historyEnabled && history.length > 0 && (
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-faint">
                  {history.length} entr{history.length === 1 ? 'y' : 'ies'} recorded.
                </p>
                <Button variant="ghost" size="sm" onClick={() => setConfirmClearHistory(true)}>
                  Clear history
                </Button>
              </div>
            )}
          </div>
        </SettingsSection>

        <SettingsSection title="Shortcuts & data" icon={<Bookmark size={13} />}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-ink">Quick links</p>
                <p className="mt-0.5 text-xs text-faint">{favorites.length} shortcut{favorites.length === 1 ? '' : 's'} stored locally.</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setAddOpen(true)}>
                Add
              </Button>
            </div>
            <DataManager />
            <SettingsRow
              label="Show site icons"
              hint="Fetched from DuckDuckGo's icon service — it sees which shortcut and tab domains you use. Falls back to letter tiles. Off = zero image requests."
              control={
                <Toggle
                  checked={settings.showSiteIcons}
                  onChange={(v) => setSettings({ showSiteIcons: v })}
                  label="Show site icons"
                />
              }
            />
            <Button variant="ghost" size="sm" onClick={() => setConfirmRestore(true)} className="justify-start">
              Restore starter shortcuts
            </Button>
          </div>
        </SettingsSection>

        <SettingsSection title="Data & privacy" icon={<Database size={13} />}>
          <ul className="flex flex-col gap-2.5 text-xs leading-relaxed text-muted">
            <li className="flex gap-2">
              <span className="text-accent">·</span>
              <span>
                Favorites, settings and checklist progress live in localStorage (key{' '}
                <code className="rounded bg-raised px-1 font-mono text-[10px]">velora:v1</code>) —
                no account, no server.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-accent">·</span>
              <span>
                Vault passwords are stored <strong className="text-ink">encrypted</strong>
                (AES-GCM 256, PBKDF2-SHA256). Your master password is never stored — it exists only
                in memory while the vault is unlocked. Everything else in localStorage is{' '}
                <strong className="text-ink">not</strong> encrypted.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-accent">·</span>
              <span>
                History is opt-in and off by default. When enabled, entries stay on this device and
                are never included in backups.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-accent">·</span>
              <span>
                Only two things ever leave: search queries go to your selected engine, and opening a
                link contacts that site (plus optional site icons from DuckDuckGo's service). Nothing
                is sent to Velora — there is no Velora server.
              </span>
            </li>
          </ul>
          <div className="mt-1 rounded-lg border border-rose-500/25 bg-rose-500/5 px-3.5 py-3">
            <p className="mb-2 text-xs font-medium text-rose-500">Danger zone</p>
            <Button variant="danger" size="sm" onClick={() => setConfirmWipe(true)}>
              Delete all Velora data
            </Button>
          </div>
        </SettingsSection>

        <SettingsSection title="About" icon={<Info size={13} />}>
          <div className="flex flex-col gap-2.5 text-xs leading-relaxed text-faint">
            <p>
              Velora v{APP_VERSION} — a calm, local-first start page. MIT-licensed; see the README for
              deployment instructions.
            </p>
            <div className="flex flex-col gap-1">
              <p className="font-medium text-muted">Keyboard shortcuts</p>
              <p>
                <kbd className="kbd">/</kbd> or <kbd className="kbd">Ctrl</kbd>+<kbd className="kbd">K</kbd> — focus search
              </p>
              <p>
                <kbd className="kbd">Esc</kbd> — close dialogs
              </p>
            </div>
          </div>
        </SettingsSection>
      </div>

      <FavoriteForm open={addOpen} onClose={() => setAddOpen(false)} />

      <ConfirmDialog
        open={confirmRestore}
        onClose={() => setConfirmRestore(false)}
        onConfirm={() => {
          restoreExamples()
          push('Starter shortcuts restored')
        }}
        title="Restore starter shortcuts"
        message="This replaces your current shortcuts with the Velora starter set. Export first if you want to keep them."
        confirmLabel="Restore"
      />
      <ConfirmDialog
        open={confirmWipe}
        onClose={() => setConfirmWipe(false)}
        onConfirm={wipeAll}
        title="Delete all Velora data"
        message="This permanently removes your shortcuts, settings, checklist progress and history, then reloads the page. The encrypted password vault is deleted too. This cannot be undone."
        confirmLabel="Delete everything"
      />
      <ConfirmDialog
        open={confirmClearHistory}
        onClose={() => setConfirmClearHistory(false)}
        onConfirm={() => clearHistory()}
        title="Clear history"
        message={`This deletes all ${history.length} recorded entries from this browser. It cannot be undone.`}
        confirmLabel="Clear history"
      />
    </SettingsPanel>
  )
}
