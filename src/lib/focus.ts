export function getFocusable(root: HTMLElement | null): HTMLElement[] {
  if (!root) return []
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => el.getClientRects().length > 0)
}

/** Keep Tab/Shift+Tab cycling inside `root`. */
export function trapTab(e: KeyboardEvent, root: HTMLElement | null) {
  const focusable = getFocusable(root)
  if (!focusable.length) {
    e.preventDefault()
    return
  }
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = document.activeElement
  const inside = root?.contains(active) ?? false

  if (e.shiftKey && (active === first || !inside)) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && (active === last || !inside)) {
    e.preventDefault()
    first.focus()
  }
}
