import type { DatabaseSync } from 'node:sqlite'
import type { ActionId } from '../actions/types.js'
import { defaultBindings, isValidAccelerator, normalizeAccelerator, type Binding } from './bindings.js'
import { defaultGestureBindings } from '../gestus/bindings.js'

export type BindingScope = 'key' | 'gesture'
export interface StoredBinding { id: string; actionId: ActionId; accelerator: string; scope: BindingScope }

/** @implements SPEC-ORBIS-P3-SETTINGS */
const defaultStoredBindings = (scope: BindingScope): StoredBinding[] => scope === 'key'
  ? defaultBindings.map((binding) => ({ id: binding.actionId, actionId: binding.actionId, accelerator: binding.accelerator, scope }))
  : Object.entries(defaultGestureBindings).map(([accelerator, actionId]) => ({ id: `gesture:${actionId}`, actionId, accelerator, scope }))

/** @implements SPEC-ORBIS-P3-CLAVIS */
export class BindingStore {
  /** @implements SPEC-ORBIS-P3-SETTINGS */
  constructor(private readonly db: DatabaseSync) {}

  /** @implements SPEC-ORBIS-P3-SETTINGS */
  list(scope: BindingScope): StoredBinding[] {
    const stored = this.snapshot(scope)
    const storedById = new Map(stored.map((binding) => [binding.id, binding]))
    return defaultStoredBindings(scope).map((binding) => {
      const override = storedById.get(binding.id)
      return override ? { ...binding, accelerator: override.accelerator } : binding
    })
  }

  /** @implements SPEC-ORBIS-P3-SETTINGS */
  supports(binding: StoredBinding): boolean {
    return defaultStoredBindings(binding.scope).some((candidate) => candidate.id === binding.id && candidate.actionId === binding.actionId)
  }

  /** @implements SPEC-ORBIS-P3-SETTINGS */
  save(binding: StoredBinding): void {
    const accelerator = binding.scope === 'key' ? normalizeAccelerator(binding.accelerator) : binding.accelerator.toUpperCase()
    if (binding.scope === 'key' ? !isValidAccelerator(accelerator) : !/^[UDLR]{1,16}$/.test(accelerator)) {
      throw new Error('Invalid binding accelerator.')
    }
    const duplicate = this.list(binding.scope).find((candidate) => candidate.id !== binding.id && candidate.accelerator === accelerator)
    if (duplicate) throw new Error(`Binding conflict: ${accelerator}`)
    this.db.prepare('INSERT INTO binding (id, action_id, accelerator, scope) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET action_id = excluded.action_id, accelerator = excluded.accelerator, scope = excluded.scope').run(binding.id, binding.actionId, accelerator, binding.scope)
  }

  /** @implements SPEC-ORBIS-P3-SETTINGS */
  reset(scope: BindingScope): void { this.db.prepare('DELETE FROM binding WHERE scope = ?').run(scope) }

  /** @implements SPEC-ORBIS-P3-SETTINGS */
  snapshot(scope: BindingScope): StoredBinding[] {
    const rows = this.db.prepare('SELECT id, action_id, accelerator, scope FROM binding WHERE scope = ? ORDER BY action_id').all(scope) as { id: string; action_id: ActionId; accelerator: string; scope: BindingScope }[]
    return rows.map((row) => ({ id: row.id, actionId: row.action_id, accelerator: row.accelerator, scope: row.scope }))
  }

  /** @implements SPEC-ORBIS-P3-SETTINGS */
  restore(scope: BindingScope, bindings: StoredBinding[]): void {
    this.db.exec('BEGIN')
    try {
      this.reset(scope)
      const insert = this.db.prepare('INSERT INTO binding (id, action_id, accelerator, scope) VALUES (?, ?, ?, ?)')
      for (const binding of bindings) insert.run(binding.id, binding.actionId, binding.accelerator, binding.scope)
      this.db.exec('COMMIT')
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }

  /** @implements SPEC-ORBIS-P3-CLAVIS */
  keyBindings(): Binding[] { return this.list('key').map((binding) => ({ accelerator: binding.accelerator, actionId: binding.actionId, global: defaultBindings.find((item) => item.actionId === binding.actionId)?.global ?? false })) }

  /** @implements SPEC-ORBIS-P3-CLAVIS */
  isGlobalKeyBinding(actionId: ActionId): boolean { return defaultBindings.some((binding) => binding.actionId === actionId && binding.global) }
}
