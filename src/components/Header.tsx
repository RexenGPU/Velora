import { History, KeyRound, LayoutGrid, ScanSearch, Wrench } from 'lucide-react'
import { motion } from 'motion/react'
import { Logo } from '@/components/Logo'
import { PrivacyPill } from '@/components/PrivacyPill'
import { ThemeToggle } from '@/components/ThemeToggle'
import { IconButton } from '@/components/ui/IconButton'
import { isElectron } from '@/lib/app'
import { useStore } from '@/lib/store'
import { Settings2 } from 'lucide-react'
import type { View } from '@/App'

const BASE_ITEMS: { view: View; label: string; icon: typeof LayoutGrid }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { view: 'vault', label: 'Vault', icon: KeyRound },
  { view: 'history', label: 'History', icon: History },
  { view: 'inspect', label: 'Inspector', icon: ScanSearch },
  { view: 'tools', label: 'Tools', icon: Wrench },
]

interface HeaderProps {
  view: View
  onOpenSettings: () => void
}

export function Header({ view, onOpenSettings }: HeaderProps) {
  const { settings } = useStore()
  const navItems = BASE_ITEMS.filter((i) => i.view !== 'history' || settings.historyEnabled)

  return (
    <header
      className={`glass sticky ${isElectron ? 'top-9' : 'top-0'} z-40 border-b border-line`}
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 sm:px-6">
        <a href="#/" aria-label="Velora home" className="mr-1 flex items-center gap-2.5">
          <Logo size={26} />
          <span className="hidden min-[400px]:block text-[17px] font-semibold tracking-tight">
            Velora
          </span>
        </a>

        <nav aria-label="Primary" className="flex items-center gap-0.5">
          {navItems.map((item) => {
            const active = view === item.view
            return (
              <a
                key={item.view}
                href={`#/${item.view}`}
                aria-current={active ? 'page' : undefined}
                className={`relative flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors duration-150 ${
                  active ? 'text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    className="absolute inset-0 rounded-lg border border-line bg-raised"
                  />
                )}
                <item.icon size={16} className="relative z-10" />
                <span className="relative z-10 hidden lg:inline">{item.label}</span>
              </a>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <PrivacyPill />
          <ThemeToggle />
          <IconButton label="Settings" onClick={onOpenSettings}>
            <Settings2 size={16} />
          </IconButton>
        </div>
      </div>
    </header>
  )
}
