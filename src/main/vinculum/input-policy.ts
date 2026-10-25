/** @implements SPEC-ORBIS-VINCULUM-INPUT This self-contained predicate runs in the target renderer. */
export function isSensitiveInput(element: Element | null): boolean {
  if (!element) return false
  if (element.tagName.toLowerCase() === 'input' && element.getAttribute('type')?.toLowerCase() === 'password') return true
  return (element.getAttribute('autocomplete') ?? '').toLowerCase().split(/\s+/).some(value =>
    ['current-password', 'new-password', 'one-time-code'].includes(value) || value.startsWith('cc-'))
}

/** Resolve focus through same-origin frames and open shadow roots; inaccessible frames fail closed. */
export function focusedInput(): Element | null {
  let element = document.activeElement
  while (element) {
    if (element.shadowRoot?.activeElement) { element = element.shadowRoot.activeElement; continue }
    if (element.tagName.toLowerCase() === 'iframe') {
      try {
        const child = (element as HTMLIFrameElement).contentDocument
        if (!child) throw new Error('Focused frame is inaccessible.')
        element = child.activeElement
        continue
      } catch { throw new Error('Focused frame is inaccessible.') }
    }
    return element
  }
  return null
}
