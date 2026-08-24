import type { ReactElement } from 'react'
import type { RotaCuraView } from '../../shared/ipc-contract'
import { wheelPositions } from './wheel-layout'
import styles from './RotaApp.module.css'

interface CuraWheelProps {
  curas: readonly RotaCuraView[]
  selectedId: string | null
  rotation: number
  onSelect(curaId: string): void
}

/** @implements SPEC-ORBIS-P4-ROTA SPEC-ORBIS-P4-OVERLAY */
export function CuraWheel({ curas, selectedId, rotation, onSelect }: CuraWheelProps): ReactElement {
  return (
    <section className={styles.wheel} aria-label="Cura wheel">
      {wheelPositions(curas, rotation, 190).map((position) => {
        const cura = curas.find((item) => item.id === position.id)
        if (!cura) return null
        return (
          <button
            className={cura.id === selectedId ? styles.curaSelected : styles.cura}
            key={cura.id}
            onClick={() => onSelect(cura.id)}
            style={{ left: `calc(50% + ${position.x}px)`, top: `calc(50% + ${position.y}px)`, borderColor: cura.color }}
          >
            <span className={styles.color} style={{ backgroundColor: cura.color }} />
            <span>{cura.title}</span>
            <small>{cura.nodeCount} nodes</small>
          </button>
        )
      })}
    </section>
  )
}
