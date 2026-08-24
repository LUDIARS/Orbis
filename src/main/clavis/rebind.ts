import { globalShortcut } from 'electron'
import type { ActionId } from '../actions/types.js'
import type { Binding } from './bindings.js'

/**
 * グローバルショートカットを束縛し直す。
 * 他アプリに取られている accelerator は失敗として返すだけで、起動は止めない
 * (ブラウザ本体はショートカット 1 つ欠けても動くべき)。
 * @implements SPEC-ORBIS-P3-CLAVIS
 */
export function rebindGlobalShortcuts(bindings: Binding[], execute: (id: ActionId) => void): string[] {
  globalShortcut.unregisterAll()
  const failed: string[] = []
  for (const binding of bindings.filter((item) => item.global)) {
    if (globalShortcut.register(binding.accelerator, () => execute(binding.actionId))) continue
    failed.push(binding.accelerator)
    console.warn(`Unable to register the global shortcut ${binding.accelerator}; it stays unbound.`)
  }
  return failed
}
