import { useMemo } from 'react'
import { Database, Globe, Link2 } from 'lucide-react'
import { useStore } from '@/lib/store'
import { storeSizeBytes } from '@/lib/storage'
import { formatBytes } from '@/lib/format'
import { getEngine } from '@/lib/engines'
import { Panel } from '@/components/ui/Panel'

export function LocalDataPanel() {
  const { favorites, settings } = useStore()
  const engine = getEngine(settings.engine, settings.customEngine)

  const bytes = useMemo(() => storeSizeBytes(), [favorites, settings])

  const rows = [
    { icon: <Link2 size={13} />, label: 'Shortcuts', value: String(favorites.length) },
    { icon: <Database size={13} />, label: 'Storage used', value: `~${formatBytes(bytes)}` },
    { icon: <Globe size={13} />, label: 'Search engine', value: engine.name },
  ]

  return (
    <Panel title="Local data" icon={<Database size={14} />}>
      <dl className="flex flex-col gap-1">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors duration-100 hover:bg-raised/60"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-raised text-muted">
              {r.icon}
            </span>
            <dt className="flex-1 text-sm text-muted">{r.label}</dt>
            <dd className="text-sm font-medium tabular-nums text-ink">{r.value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 text-xs leading-relaxed text-faint">
        Vault passwords are stored encrypted (AES-GCM, master password never stored). Everything
        else here is plain localStorage — not encrypted, so avoid storing secrets outside the
        vault. Velora loads no third-party scripts.
      </p>

      <div className="mt-4 border-t border-line pt-3.5">
        <p className="mb-2 text-xs font-medium text-muted">Backup</p>
        <p className="text-[11px] leading-relaxed text-faint">
          Export your shortcuts and settings as JSON, or import a backup you exported earlier.
          Settings → Shortcuts & data has the full controls.
        </p>
      </div>
    </Panel>
  )
}
