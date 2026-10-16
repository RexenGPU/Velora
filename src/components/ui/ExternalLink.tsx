import { ArrowUpRight } from 'lucide-react'

interface ExternalLinkProps {
  href: string
  children: React.ReactNode
  className?: string
  ariaLabel?: string
}

/** Link that opens in a new tab with noopener/noreferrer. */
export function ExternalLink({ href, children, className = '', ariaLabel }: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-1 text-accent transition-colors hover:text-accent-strong ${className}`}
    >
      {children}
      <ArrowUpRight size={13} className="shrink-0" />
    </a>
  )
}
