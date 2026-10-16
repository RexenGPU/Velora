import { ArrowRight, HardDrive, Lock, LockOpen, ShieldCheck } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'

export function PrivacyOverview() {
  const protocol = window.location.protocol

  const connection =
    protocol === 'https:'
      ? {
          chip: 'bg-emerald-500/10 text-emerald-500',
          icon: <Lock size={14} />,
          title: 'This page is loaded over HTTPS',
          detail: 'The connection between your browser and this page is encrypted.',
        }
      : protocol === 'file:'
        ? {
            chip: 'bg-raised text-muted',
            icon: <HardDrive size={14} />,
            title: 'Opened as a local file',
            detail: 'Nothing left your device — there is no network connection at all.',
          }
        : {
            chip: 'bg-amber-500/10 text-amber-500',
            icon: <LockOpen size={14} />,
            title: 'This page is not encrypted',
            detail:
              'Anyone on your network can read this traffic. Serve Velora over HTTPS before using it on public networks.',
          }

  return (
    <Panel title="Privacy overview" icon={<ShieldCheck size={14} />}>
      <div className="flex flex-col gap-3.5">
        <div className="flex items-start gap-3">
          <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${connection.chip}`}>
            {connection.icon}
          </span>
          <div>
            <p className="text-sm font-medium text-ink">{connection.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-faint">{connection.detail}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-raised text-muted">
            <HardDrive size={14} />
          </span>
          <p className="text-xs leading-relaxed text-faint">
            Favorites, settings and checklist progress live in this browser's localStorage — no
            account, no server. If site icons are on, your browser fetches shortcut logos from
            DuckDuckGo's icon service (toggle in Settings).
          </p>
        </div>

        <details className="group rounded-lg border border-line bg-raised/50 px-3.5 py-2.5">
          <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-medium text-muted">
            What HTTPS does — and doesn't
            <span className="transition-transform duration-150 group-open:rotate-180">▾</span>
          </summary>
          <div className="mt-2.5 grid gap-2.5 text-xs leading-relaxed text-faint sm:grid-cols-2">
            <div>
              <p className="mb-1 font-medium text-emerald-500/90">It does</p>
              <ul className="list-disc space-y-1 pl-4">
                <li>Encrypts traffic between you and the site</li>
                <li>Verifies the server's identity</li>
              </ul>
            </div>
            <div>
              <p className="mb-1 font-medium text-amber-500/90">It doesn't</p>
              <ul className="list-disc space-y-1 pl-4">
                <li>Stop the site itself from logging or misusing your data</li>
                <li>Hide your IP address</li>
                <li>Guarantee the site is free of trackers</li>
              </ul>
            </div>
          </div>
        </details>

        <div className="mt-1 grid gap-2 sm:grid-cols-2">
          <a
            href="#/inspect"
            className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-accent/40 bg-accent-soft px-3 text-sm font-medium text-accent transition-colors duration-150 hover:border-accent/60"
          >
            Inspect a website
            <ArrowRight size={14} />
          </a>
          <a
            href="#/tools"
            className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-raised px-3 text-sm font-medium text-ink transition-colors duration-150 hover:border-line-strong"
          >
            Privacy tools
          </a>
        </div>

        <p className="text-[11px] leading-relaxed text-faint">
          Velora never claims a site is "safe" from its URL alone — see the inspector for what is
          actually checked.
        </p>
      </div>
    </Panel>
  )
}
