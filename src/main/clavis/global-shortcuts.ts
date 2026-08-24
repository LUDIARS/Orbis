import { globalShortcut } from 'electron'
import type { Binding } from './bindings.js'
import { defaultBindings } from './bindings.js'
import { rebindGlobalShortcuts } from './rebind.js'
import type { ActionId } from '../actions/types.js'

/** @implements SPEC-ORBIS-P0-CLAVIS SPEC-ORBIS-P3-CLAVIS */
export function registerGlobalShortcuts(execute: (id: ActionId) => void, bindings: Binding[] = defaultBindings): void { rebindGlobalShortcuts(bindings, execute) }
export const unregisterGlobalShortcuts = (): void => globalShortcut.unregisterAll()
