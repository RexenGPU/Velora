export function Footer() {
  return (
    <footer className="mt-8 border-t border-line">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 text-xs text-faint sm:px-6">
        <span>Velora — local-first, no accounts, no analytics.</span>
        <nav className="flex items-center gap-4">
          <a href="#/inspect" className="transition-colors hover:text-ink">
            Inspector
          </a>
          <a href="#/tools" className="transition-colors hover:text-ink">
            Privacy tools
          </a>
        </nav>
      </div>
    </footer>
  )
}
