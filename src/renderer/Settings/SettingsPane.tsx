import { useEffect, useState, type ReactElement } from 'react'
import type { BindingScope, BindingView } from '../../shared/ipc-contract'
import { BindingRow } from './BindingRow'

/** @implements SPEC-ORBIS-P3-SETTINGS */
export function SettingsPane({ open, onClose }: { open: boolean; onClose: () => void }): ReactElement | null {
  const [keys, setKeys] = useState<BindingView[]>([])
  const [gestures, setGestures] = useState<BindingView[]>([])
  const [error, setError] = useState<string | null>(null)
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
    void Promise.all([load('key'), load('gesture')]).catch(reportError)
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
  </aside>
}
