import { Cookie, VenetianMask } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'

export function CookieEducation() {
  return (
    <Panel title="Third-party cookies, explained" icon={<Cookie size={15} />}>
      <div className="flex flex-col gap-3 text-xs leading-relaxed text-muted">
        <p>
          <span className="font-medium text-ink">First-party cookies</span> are set by the site you
          visit — they remember your login, preferences, and cart.
        </p>
        <p>
          <span className="font-medium text-ink">Third-party cookies</span> are set by someone else —
          an ad network, analytics service, or widget — and can follow you across sites, building
          a profile of where you go.
        </p>
        <div className="rounded-lg border border-line bg-raised/50 px-3.5 py-2.5">
          <p className="mb-1 font-medium text-ink">What's changing</p>
          <p className="text-faint">
            Safari blocks third-party cookies by default; Firefox isolates them (Enhanced Tracking
            Protection); Chrome is restricting them by default. The web is moving away from
            cross-site cookies — but fingerprinting and first-party tracking remain.
          </p>
        </div>
        <p>
          <span className="font-medium text-ink">How to check:</span> open your browser's cookie
          settings (see the checklist) and confirm third-party cookies are blocked. In Chrome DevTools
          → Application → Cookies, you can see exactly which domains set cookies on any page.
        </p>
      </div>
    </Panel>
  )
}

export function PrivateBrowsingExplainer() {
  return (
    <Panel title="Private browsing vs. tracking protection" icon={<VenetianMask size={15} />}>
      <div className="grid gap-3 text-xs leading-relaxed sm:grid-cols-2">
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3.5 py-2.5">
          <p className="mb-1.5 font-medium text-emerald-500/90">Private windows do</p>
          <ul className="list-disc space-y-1 pl-4 text-muted">
            <li>Discard history and cookies when you close the window</li>
            <li>Start each session clean</li>
            <li>Keep your activity off this device's browser history</li>
          </ul>
        </div>
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3.5 py-2.5">
          <p className="mb-1.5 font-medium text-amber-500/90">They don't</p>
          <ul className="list-disc space-y-1 pl-4 text-muted">
            <li>Hide your IP address from sites you visit</li>
            <li>Stop the sites themselves from logging your activity</li>
            <li>Protect you from your ISP, employer, or network operator</li>
            <li>Prevent browser fingerprinting</li>
          </ul>
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-faint">
        Private windows protect the device you're on. Tracking protection features (Firefox ETP,
        Safari ITP, Brave Shields) are what limit what sites can learn — they work in normal windows
        too.
      </p>
    </Panel>
  )
}
