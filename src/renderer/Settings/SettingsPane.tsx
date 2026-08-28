import { useEffect, useState, type ReactElement } from 'react'
import type { BindingScope, BindingView, VitrumViewState } from '../../shared/ipc-contract'
import { BindingRow } from './BindingRow'

/** @implements SPEC-ORBIS-P3-SETTINGS SPEC-ORBIS-VITRUM-ACTION */
export function SettingsPane({ open, onClose }: { open: boolean; onClose: () => void }): ReactElement | null {
  const [keys, setKeys] = useState<BindingView[]>([])
  const [gestures, setGestures] = useState<BindingView[]>([])
  const [error, setError] = useState<string | null>(null)
  const [vitrum, setVitrum] = useState<VitrumViewState | null>(null)
  const [filterKind, setFilterKind] = useState<VitrumViewState['spec']['filters'][number]['kind']>('brightness')
  const [filterValue, setFilterValue] = useState('1')
  /** @implements SPEC-ORBIS-P3-SETTINGS */
  const reportError = (reason: unknown): void => setError(reason instanceof Error ? reason.message : 'Unable to update bindings.')
  /** @implements SPEC-ORBIS-P3-SETTINGS */
  const load = async (scope: BindingScope): Promise<void> => {
    const bindings = await window.orbis.bindings(scope)
    if (scope === 'key') setKeys(bindings)
    else setGestures(bindings)
  }
  useEffect(() => {
    if (!open) return
    void Promise.all([load('key'), load('gesture'), window.orbis.vitrum().then(setVitrum)]).catch(reportError)
  }, [open])
  useEffect(() => {
    window.orbis.setSettingsPaneOpen(open)
    return () => { if (open) window.orbis.setSettingsPaneOpen(false) }
  }, [open])
  if (!open) return null
  /** @implements SPEC-ORBIS-P3-SETTINGS */
  const save = async (binding: BindingView): Promise<void> => {
    setError(null)
    try { await window.orbis.saveBinding(binding); await load(binding.scope) } catch (reason) { reportError(reason); try { await load(binding.scope) } catch { /* Retain the more useful mutation error. */ } }
  }
  /** @implements SPEC-ORBIS-P3-SETTINGS */
  const reset = async (scope: BindingScope): Promise<void> => {
    setError(null)
    try { await window.orbis.resetBindings(scope); await load(scope) } catch (reason) { reportError(reason); try { await load(scope) } catch { /* Retain the more useful mutation error. */ } }
  }
  return <aside style={{ position: 'fixed', zIndex: 50, right: 8, top: 8, width: 390, boxSizing: 'border-box', maxHeight: '90vh', overflow: 'auto', background: '#fff', color: '#111', padding: 14, boxShadow: '0 2px 16px #0008' }}>
    <button onClick={onClose}>Close</button><h2>Settings</h2>{error && <p role="alert">{error}</p>}<h3>Keyboard bindings</h3>{keys.map((binding) => <BindingRow key={binding.id} binding={binding} onSave={save} />)}<button onClick={() => { void reset('key') }}>Restore defaults</button>
    <h3>Gesture bindings</h3>{gestures.map((binding) => <BindingRow key={binding.id} binding={binding} onSave={save} />)}<button onClick={() => { void reset('gesture') }}>Restore defaults</button>
    <h3>Display filter</h3><select aria-label="Display filter" value={vitrum?.spec.id ?? 'none'} onChange={(event) => { void window.orbis.setVitrum({ id: event.target.value, filters: [] }).then(setVitrum).catch(reportError) }}>{(vitrum?.presets ?? ['none']).map((preset) => <option key={preset}>{preset}</option>)}</select>
    <h4>Custom parameter</h4><select aria-label="Filter kind" value={filterKind} onChange={(event) => setFilterKind(event.target.value as typeof filterKind)}>{['brightness', 'contrast', 'saturate', 'hue-rotate', 'invert', 'sepia', 'grayscale', 'blur'].map((kind) => <option key={kind}>{kind}</option>)}</select><input aria-label="Filter value" type="number" value={filterValue} onChange={(event) => setFilterValue(event.target.value)} /><button onClick={() => { const value = Number(filterValue); if (!Number.isFinite(value)) { reportError(new Error('Filter value must be a number.')); return } void window.orbis.setVitrum({ id: 'custom', filters: [{ kind: filterKind, value }] }).then(setVitrum).catch(reportError) }}>Apply custom filter</button>
  </aside>
}
