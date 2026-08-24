import type { Input, WebContents } from 'electron'
import { defaultBindings, normalizeAccelerator, type Binding } from './bindings.js'
import type { ActionId } from '../actions/types.js'

const acceleratorOf = (input: Input): string => {
  const parts: string[] = []
  if (input.control || input.meta) parts.push('CommandOrControl')
  if (input.shift) parts.push('Shift')
  if (input.alt) parts.push('Alt')
  parts.push(input.key === ' ' ? 'Space' : input.key.length === 1 ? input.key.toUpperCase() : input.key)
  return normalizeAccelerator(parts.join('+'))
}

/**
 * ウインドウ内 (非 global) のショートカットを before-input-event で解決する。
 * @implements SPEC-ORBIS-P0-CLAVIS SPEC-ORBIS-P3-CLAVIS
 */
export function registerLocalShortcuts(webContents: WebContents, execute: (id: ActionId) => void, bindings: Binding[] | (() => Binding[]) = defaultBindings): void {
  webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown' || input.isAutoRepeat) return
    const accelerator = acceleratorOf(input)
    const currentBindings = typeof bindings === 'function' ? bindings() : bindings
    const binding = currentBindings.find((item) => !item.global && item.accelerator === accelerator)
    if (!binding) return
    event.preventDefault()
    execute(binding.actionId)
  })
}
