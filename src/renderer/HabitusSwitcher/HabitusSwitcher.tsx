import type { ReactElement } from 'react'
import type { HabitusId } from '../../shared/ipc-contract'

interface Props { value: HabitusId; onChange(value: HabitusId): void }

/** @implements SPEC-ORBIS-P2-HABITUS */
export function HabitusSwitcher({ value, onChange }: Props): ReactElement {
  return <label>用途 <select aria-label="Habitus" value={value} onChange={(event) => onChange(event.target.value as HabitusId)}>
    <option value="desktop">desktop</option><option value="mobile">mobile</option><option value="shopping">shopping</option>
  </select></label>
}
