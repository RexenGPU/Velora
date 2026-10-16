import { Wrench } from 'lucide-react'
import { ChecklistPanel, TrackerListPanel } from '@/features/privacy/ChecklistPanel'
import { CookieEducation, PrivateBrowsingExplainer } from '@/features/privacy/EducationPanels'
import { QuickLinks } from '@/features/privacy/QuickLinks'

export function ToolsView() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 pt-8 md:pt-12">
      <header>
        <h1 className="flex items-center gap-3 text-xl font-semibold tracking-tight">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Wrench size={20} />
          </span>
          Privacy tools
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          Honest, local tools and references. Velora can't block trackers from a web page — these
          help you check and configure what your browser can.
        </p>
      </header>

      <ChecklistPanel />

      <div className="grid gap-4 md:grid-cols-2">
        <CookieEducation />
        <PrivateBrowsingExplainer />
      </div>

      <TrackerListPanel />
      <QuickLinks />
    </div>
  )
}
