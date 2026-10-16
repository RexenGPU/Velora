import { forwardRef, type ButtonHTMLAttributes } from 'react'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  size?: 'sm' | 'md'
}

const sizes = {
  sm: 'size-8',
  md: 'size-9',
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = 'md', className = '', type = 'button', children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:text-ink hover:bg-raised disabled:opacity-50 disabled:pointer-events-none ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
})
