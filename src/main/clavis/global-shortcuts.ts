import { globalShortcut } from 'electron'
import { defaultBindings } from './bindings.js'
import type { ActionId } from '../actions/types.js'

/** @implements SPEC-ORBIS-P0-CLAVIS */
export function registerGlobalShortcuts(execute: (id: ActionId) => void): void {
  for (const binding of defaultBindings.filter((item) => item.global)) {
    if (globalShortcut.register(binding.accelerator, () => execute(binding.actionId))) continue
    globalShortcut.unregisterAll()
    throw new Error(`Unable to register required shortcut: ${binding.accelerator}`)
  }
}
export const unregisterGlobalShortcuts = (): void => globalShortcut.unregisterAll()
