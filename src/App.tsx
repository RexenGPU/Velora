import { useEffect, useState } from 'react'
import { MotionConfig, motion } from 'motion/react'
import { ToastProvider } from '@/components/ui/Toast'
import { StoreProvider, useStore } from '@/lib/store'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { isElectron } from '@/lib/app'
import { AutoLoginBridge } from '@/components/AutoLoginBridge'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Dashboard } from '@/features/dashboard/Dashboard'
import { InspectorView } from '@/features/privacy/InspectorView'
import { ToolsView } from '@/features/privacy/ToolsView'
import { VaultView } from '@/features/vault/VaultView'
import { HistoryView } from '@/features/history/HistoryView'
import { SettingsContent } from '@/features/settings/SettingsContent'

export type View = 'dashboard' | 'inspect' | 'tools' | 'vault' | 'history'

const VIEWS: View[] = ['dashboard', 'inspect', 'tools', 'vault', 'history']

function viewFromHash(): View {
  if (typeof window === 'undefined') return 'dashboard'
  const h = window.location.hash.replace(/^#\/?/, '').split(/[/?]/)[0]
  return (VIEWS as string[]).includes(h) ? (h as View) : 'dashboard'
}

function AppShell() {
  const [view, setView] = useState<View>(viewFromHash)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { settings } = useStore()
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)')
  const resolved = settings.theme === 'system' ? (systemDark ? 'dark' : 'light') : settings.theme

  useEffect(() => {
    const onHash = () => setView(viewFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Desktop: track the sidebar width so content is never covered by it.
  useEffect(() => {
    if (!isElectron) return
    document.documentElement.style.setProperty('--v-sidebar', '46px')
    const onLayout = (e: Event) => {
      const width = (e as CustomEvent<{ sidebarWidth: number }>).detail?.sidebarWidth
      if (typeof width === 'number' && width > 0) {
        document.documentElement.style.setProperty('--v-sidebar', `${width}px`)
      }
    }
    window.addEventListener('velora:layout', onLayout)
    return () => window.removeEventListener('velora:layout', onLayout)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = resolved
  }, [resolved])

  useEffect(() => {
    document.documentElement.dataset.accent = settings.accent
  }, [settings.accent])

  useEffect(() => {
    document.documentElement.dataset.layout = settings.layout
  }, [settings.layout])

  useEffect(() => {
    let meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'theme-color')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', resolved === 'dark' ? '#090b10' : '#f4f5f7')
  }, [resolved])

  // Global shortcut: "/" or Ctrl/Cmd+K focuses the search bar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      if (typing) return
      const wantsSearch =
        e.key === '/' || ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'k' || e.key.toLowerCase() === 'l'))
      if (wantsSearch) {
        e.preventDefault()
        const focusSearch = () => document.getElementById('velora-search')?.focus()
        if (view !== 'dashboard') {
          window.location.hash = '#/dashboard'
          setTimeout(focusSearch, 120)
        } else {
          focusSearch()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view])

  return (
    <div
      className="flex min-h-dvh flex-col"
      style={isElectron ? { paddingLeft: 'var(--v-sidebar, 46px)' } : undefined}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-on-accent"
      >
        Skip to content
      </a>
      {/* Desktop chrome: native titlebar (36px) and left sidebar (46px). */}
      {isElectron && <div aria-hidden="true" className="h-9 w-full shrink-0" />}
      <Header view={view} onOpenSettings={() => setSettingsOpen(true)} />
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 sm:px-6">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {view === 'dashboard' && <Dashboard />}
          {view === 'inspect' && <InspectorView />}
          {view === 'tools' && <ToolsView />}
          {view === 'vault' && <VaultView />}
          {view === 'history' && <HistoryView />}
        </motion.div>
      </main>
      <Footer />
      <SettingsContent open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <StoreProvider>
          <AutoLoginBridge />
          <AppShell />
        </StoreProvider>
      </ToastProvider>
    </MotionConfig>
  )
}
