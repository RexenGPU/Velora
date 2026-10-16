import { useStore } from '@/lib/store'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { IconButton } from '@/components/ui/IconButton'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const { settings, setSettings } = useStore()
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)')
  const resolved = settings.theme === 'system' ? (systemDark ? 'dark' : 'light') : settings.theme

  return (
    <IconButton
      label={resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      title="Theme — system option in Settings"
      onClick={() => setSettings({ theme: resolved === 'dark' ? 'light' : 'dark' })}
    >
      {resolved === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </IconButton>
  )
}
