import { useEffect, useState, type ReactElement } from 'react'
import type { BindingView } from '../../shared/ipc-contract'

/** @implements SPEC-ORBIS-P3-SETTINGS */
const acceleratorFor = (event: React.KeyboardEvent<HTMLInputElement>): string => {
  const parts: string[] = []
  if (event.ctrlKey || event.metaKey) parts.push('CommandOrControl')
  if (event.shiftKey) parts.push('Shift')
  if (event.altKey) parts.push('Alt')
  parts.push(event.key === ' ' ? 'Space' : event.key.length === 1 ? event.key.toUpperCase() : event.key)
  return parts.join('+')
}

const modifierKeys = new Set(['Alt', 'Control', 'Meta', 'Shift'])

/** @implements SPEC-ORBIS-P3-SETTINGS */
export function BindingRow({ binding, onSave }: { binding: BindingView; onSave: (binding: BindingView) => Promise<void> }): ReactElement {
  const [accelerator, setAccelerator] = useState(binding.accelerator)
  useEffect(() => setAccelerator(binding.accelerator), [binding.accelerator])
  /** @implements SPEC-ORBIS-P3-SETTINGS */
  const capture = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (binding.scope !== 'key' || modifierKeys.has(event.key)) return
    event.preventDefault()
    const value = acceleratorFor(event)
    setAccelerator(value)
    void onSave({ ...binding, accelerator: value })
  }
  return <label style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBlock: 4 }}><span>{binding.actionId}</span><input value={accelerator} onChange={(event) => setAccelerator(event.target.value.toUpperCase())} onBlur={() => { if (accelerator !== binding.accelerator) void onSave({ ...binding, accelerator }) }} onKeyDown={capture} /></label>
}
