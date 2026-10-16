import { useState, type FormEvent } from 'react'
import {
  CircleAlert,
  CircleCheck,
  CircleDashed,
  Copy,
  Info,
  ScanSearch,
  TriangleAlert,
} from 'lucide-react'
import { inspectUrl, type InsightLevel, type Inspection } from '@/lib/inspect'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

const levelStyles: Record<InsightLevel, string> = {
  secure: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500',
  info: 'border-accent/40 bg-accent-soft text-accent',
  warn: 'border-amber-500/40 bg-amber-500/10 text-amber-500',
  alert: 'border-rose-500/40 bg-rose-500/10 text-rose-500',
  none: 'border-line bg-raised text-muted',
}

const levelChips: Record<InsightLevel, string> = {
  secure: 'bg-emerald-500/10 text-emerald-500',
  info: 'bg-accent-soft text-accent',
  warn: 'bg-amber-500/10 text-amber-500',
  alert: 'bg-rose-500/10 text-rose-500',
  none: 'bg-raised text-muted',
}

const levelIcons: Record<InsightLevel, typeof CircleCheck> = {
  secure: CircleCheck,
  info: Info,
  warn: TriangleAlert,
  alert: CircleAlert,
  none: CircleDashed,
}

const EXAMPLES = [
  { label: 'UTM campaign link', url: 'https://example.com/?utm_source=newsletter&utm_medium=email' },
  { label: 'Plain HTTP', url: 'http://neverssl.com' },
  { label: 'Known tracker host', url: 'https://connect.facebook.net/en_US/fbevents.js' },
]

export function InspectorView() {
  const { push } = useToast()
  const [input, setInput] = useState('')
  const [result, setResult] = useState<Inspection | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const r = inspectUrl(input)
    if (!r) {
      setError("That doesn't look like a valid address — try example.com or https://example.com.")
      setResult(null)
      return
    }
    setError(null)
    setResult(r)
  }

  const copyCleaned = () => {
    if (result?.paramAudit.cleanedUrl) {
      void navigator.clipboard?.writeText(result.paramAudit.cleanedUrl.toString())
      push('Cleaned URL copied')
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 pt-8 md:pt-12">
      <header>
        <h1 className="flex items-center gap-3 text-xl font-semibold tracking-tight">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <ScanSearch size={20} />
          </span>
          Website privacy inspector
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          Enter a URL to see what's observable from the address itself. Velora analyzes the URL
          locally and contacts nothing — no request is made to the site you inspect.
        </p>
      </header>

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="example.com or https://example.com"
          aria-label="Website URL to inspect"
          autoComplete="off"
          spellCheck={false}
          className="input h-11 flex-1"
        />
        <Button variant="primary" type="submit" size="md" className="h-11">
          Inspect
        </Button>
      </form>

      <p className="-mt-2 text-xs text-faint">
        Inspected URLs stay in memory — they are never saved.
      </p>

      {error && (
        <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-500">
          {error}
        </p>
      )}

      {!result && !error && (
        <div className="panel flex flex-col gap-3 px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-faint">
            Try an example
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.url}
                onClick={() => setInput(ex.url)}
                className="chip cursor-pointer transition-colors duration-150 hover:border-accent/50 hover:text-accent"
                title={ex.url}
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4">
          <div className="panel flex flex-col gap-3 px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${levelStyles[result.status]}`}
              >
                {(() => {
                  const Icon = levelIcons[result.status]
                  return <Icon size={14} />
                })()}
                {result.headline}
              </span>
              <span className="chip">Additional checks required</span>
              {result.assumedScheme && <span className="chip">Insufficient information</span>}
            </div>
            <p className="break-all font-mono text-xs text-faint">{result.url}</p>
          </div>

          <div className="panel flex flex-col gap-3 px-5 py-4">
            <h2 className="text-xs font-medium uppercase tracking-[0.08em] text-faint">
              Observations
            </h2>
            <ul className="flex flex-col gap-3">
              {result.observations.map((o) => {
                const Icon = levelIcons[o.level]
                return (
                  <li key={o.id} className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg ${levelChips[o.level]}`}
                    >
                      <Icon size={14} />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-ink">{o.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-faint">{o.detail}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>

          {result.paramAudit.cleanedUrl && (
            <div className="panel flex flex-col gap-2.5 px-5 py-4">
              <h2 className="text-xs font-medium uppercase tracking-[0.08em] text-faint">
                Cleaned URL
              </h2>
              <p className="break-all rounded-lg border border-line bg-raised px-3 py-2 font-mono text-xs text-muted">
                {result.paramAudit.cleanedUrl.toString()}
              </p>
              <div>
                <Button variant="secondary" size="sm" onClick={copyCleaned}>
                  <Copy size={14} />
                  Copy cleaned URL
                </Button>
              </div>
            </div>
          )}

          <div className="panel flex flex-col gap-2.5 border-dashed px-5 py-4">
            <h2 className="text-xs font-medium uppercase tracking-[0.08em] text-faint">
              What this inspection cannot see
            </h2>
            <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-muted">
              <li>Cookies this site sets</li>
              <li>Third-party requests it makes</li>
              <li>Fingerprinting scripts it runs</li>
              <li>TLS certificate details</li>
              <li>Where it redirects</li>
            </ul>
            <p className="text-xs leading-relaxed text-faint">
              A regular web page can't inspect other origins. A future Velora browser extension could
              perform these checks with explicit permissions — until then, treat this as URL
              analysis only.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
