import { BookOpen, ExternalLink, Globe, LifeBuoy, Newspaper, ShieldCheck } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'

const RESOURCES = [
  {
    name: 'EFF',
    url: 'https://www.eff.org',
    blurb: 'Digital privacy nonprofit; home of Cover Your Tracks.',
    icon: ShieldCheck,
  },
  {
    name: 'Cover Your Tracks',
    url: 'https://coveryourtracks.eff.org',
    blurb: 'Test how trackable your browser is.',
    icon: Globe,
  },
  {
    name: 'Privacy Guides',
    url: 'https://privacyguides.org',
    blurb: 'Community-maintained privacy tools and guides.',
    icon: BookOpen,
  },
  {
    name: 'Have I Been Pwned',
    url: 'https://haveibeenpwned.com',
    blurb: 'Check if your email appears in known breaches.',
    icon: LifeBuoy,
  },
  {
    name: 'Mozilla: Myths about private browsing',
    url: 'https://support.mozilla.org/kb/common-myths-about-private-browsing',
    blurb: 'Clear explanation of what private mode does.',
    icon: Newspaper,
  },
  {
    name: "Terms of Service; Didn't Read",
    url: 'https://tosdr.org',
    blurb: 'Plain-language summaries of service terms.',
    icon: ExternalLink,
  },
]

export function QuickLinks() {
  return (
    <Panel title="Privacy resources" icon={<Globe size={15} />}>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {RESOURCES.map((r) => (
          <a
            key={r.url}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 rounded-lg border border-line bg-raised/40 px-3.5 py-3 transition-all duration-150 hover:border-accent/40 hover:bg-raised"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <r.icon size={15} />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1 text-sm font-medium text-ink">
                {r.name}
                <ExternalLink size={11} className="text-faint" />
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-faint">{r.blurb}</span>
            </span>
          </a>
        ))}
      </div>
    </Panel>
  )
}
