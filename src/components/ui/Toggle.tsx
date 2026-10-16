interface ToggleProps {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  disabled?: boolean
}

export function Toggle({ checked, onChange, label, disabled = false }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200 disabled:opacity-40 ${
        checked ? 'border-accent bg-accent' : 'border-line-strong bg-raised'
      }`}
    >
      <span
        className={`absolute left-1 top-1/2 size-4 -translate-y-1/2 rounded-full shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-5 bg-surface' : 'translate-x-0 bg-muted'
        }`}
      />
    </button>
  )
}
