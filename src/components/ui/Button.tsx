import { forwardRef, type ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium text-sm select-none transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97]'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-strong',
  secondary: 'bg-raised text-ink border border-line hover:border-line-strong',
  ghost: 'text-muted hover:text-ink hover:bg-raised',
  danger: 'bg-rose-600 text-white hover:bg-rose-500',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3',
  md: 'h-9 px-3.5',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className = '', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  )
})
