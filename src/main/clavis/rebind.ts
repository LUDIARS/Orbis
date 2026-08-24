import { globalShortcut } from 'electron'
import type { ActionId } from '../actions/types.js'
import type { Binding } from './bindings.js'

/** @implements SPEC-ORBIS-P3-CLAVIS */
export function rebindGlobalShortcuts(bindings: Binding[], execute: (id: ActionId) => void): void {
  globalShortcut.unregisterAll()
  for (const binding of bindings.filter((item) => item.global)) {
    if (globalShortcut.register(binding.accelerator, () => execute(binding.actionId))) continue
    globalShortcut.unregisterAll()
    throw new Error(`Unable to register shortcut: ${binding.accelerator}`)
  }
}
