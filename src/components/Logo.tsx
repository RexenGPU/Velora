import logoUrl from '@/assets/logo.png'

export function Logo({ size = 24 }: { size?: number }) {
  return (
    <img
      src={logoUrl}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      className="shrink-0 select-none object-contain"
      draggable={false}
    />
  )
}

export function LogoWordmark({ size = 24 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <Logo size={size} />
      <span className="text-[17px] font-semibold tracking-tight">Velora</span>
    </span>
  )
}
