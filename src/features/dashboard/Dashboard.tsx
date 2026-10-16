import { useStore } from '@/lib/store'
import { Logo } from '@/components/Logo'
import { Clock } from '@/features/dashboard/Clock'
import { SearchBar } from '@/features/search/SearchBar'
import { FavoritesSection } from '@/features/favorites/FavoritesSection'
import { PrivacyOverview } from '@/features/dashboard/PrivacyOverview'
import { LocalDataPanel } from '@/features/dashboard/LocalDataPanel'

export function Dashboard() {
  const { settings } = useStore()
  const compact = settings.layout === 'compact'

  return (
    <div
      className={`relative flex flex-col items-center ${
        compact ? 'gap-7 pt-8' : 'gap-10 pt-10 md:gap-14 md:pt-14'
      }`}
    >
      {/* Identity watermark behind the hero */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 opacity-[0.04]"
      >
        <Logo size={360} />
      </div>

      <Clock />
      <div className="w-full max-w-2xl">
        <SearchBar />
      </div>
      <FavoritesSection />
      <div className="grid w-full gap-4 md:grid-cols-2">
        <PrivacyOverview />
        <LocalDataPanel />
      </div>
    </div>
  )
}
