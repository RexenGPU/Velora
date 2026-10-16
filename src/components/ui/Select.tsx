import { useId, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  label: string
  children?: ReactNode
}

export function Select({ value, onChange, options, label, children }: SelectProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-faint">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input appearance-none pr-9"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={15}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-faint"
        />
      </div>
      {children}
    </div>
  )
}
