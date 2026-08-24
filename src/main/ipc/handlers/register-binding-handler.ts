import { ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from 'electron'
import { isActionId } from '../../actions/registry.js'
import type { BindingStore, BindingScope, StoredBinding } from '../../clavis/binding-store.js'
import { channels } from '../../../shared/ipc-contract.js'

const isScope = (value: unknown): value is BindingScope => value === 'key' || value === 'gesture'

/** @implements SPEC-ORBIS-P3-SETTINGS */
const publicSaveError = (error: unknown): Error => error instanceof Error && (
  error.message.startsWith('Binding conflict:')
  || error.message === 'Invalid binding accelerator.'
  || error.message.startsWith('Unable to register shortcut:')
) ? error : new Error('Unable to save binding.')

/** @implements SPEC-ORBIS-P3-SETTINGS */
const isBinding = (value: unknown): value is StoredBinding => {
  if (!value || typeof value !== 'object') return false
  const binding = value as StoredBinding
  if (typeof binding.id !== 'string' || binding.id.length > 128 || !isActionId(binding.actionId) || typeof binding.accelerator !== 'string' || binding.accelerator.length === 0 || binding.accelerator.length > 128 || !isScope(binding.scope)) return false
  return binding.id === (binding.scope === 'key' ? binding.actionId : `gesture:${binding.actionId}`)
}

/** @implements SPEC-ORBIS-P3-SETTINGS */
export function registerBindingHandler(resolveWindow: (senderId: number) => BrowserWindow | undefined, store: BindingStore, rebind: () => void): () => void {
  /** @implements SPEC-ORBIS-P3-SETTINGS */
  const authorize = (event: IpcMainInvokeEvent): void => {
    if (!resolveWindow(event.sender.id)) throw new Error('Binding settings are only available to the Orbis UI.')
  }
  /** @implements SPEC-ORBIS-P3-SETTINGS */
  const list = (event: IpcMainInvokeEvent, scope: unknown): StoredBinding[] => {
    authorize(event)
    if (!isScope(scope)) throw new TypeError('Invalid binding scope.')
    try { return store.list(scope) } catch { throw new Error('Unable to load bindings.') }
  }
  /** @implements SPEC-ORBIS-P3-SETTINGS */
  const save = (event: IpcMainInvokeEvent, value: unknown): void => {
    authorize(event)
    if (!isBinding(value) || !store.supports(value)) throw new TypeError('Invalid binding request.')
    const requiresRebind = value.scope === 'key' && store.isGlobalKeyBinding(value.actionId)
    const previous = store.snapshot(value.scope)
    try {
      store.save(value)
      if (requiresRebind) rebind()
    } catch (error) {
      try {
        store.restore(value.scope, previous)
        if (requiresRebind) rebind()
      } catch { throw new Error('Unable to restore the previous bindings.') }
      throw publicSaveError(error)
    }
  }
  /** @implements SPEC-ORBIS-P3-SETTINGS */
  const reset = (event: IpcMainInvokeEvent, scope: unknown): void => {
    authorize(event)
    if (!isScope(scope)) throw new TypeError('Invalid binding scope.')
    const previous = store.snapshot(scope)
    try {
      store.reset(scope)
      if (scope === 'key') rebind()
    } catch {
      try {
        store.restore(scope, previous)
        if (scope === 'key') rebind()
      } catch { throw new Error('Unable to restore the previous bindings.') }
      throw new Error('Unable to restore default bindings.')
    }
  }
  ipcMain.handle(channels.bindings, list)
  ipcMain.handle(channels.bindingSave, save)
  ipcMain.handle(channels.bindingReset, reset)
  return () => {
    ipcMain.removeHandler(channels.bindings)
    ipcMain.removeHandler(channels.bindingSave)
    ipcMain.removeHandler(channels.bindingReset)
  }
}
