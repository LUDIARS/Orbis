import type { ReactElement } from 'react'
import type { RotaCuraView } from '../../shared/ipc-contract'
import styles from './RotaApp.module.css'

interface PageListProps {
  cura: RotaCuraView | null
  onSelect(pageId: string): void
}

/** @implements SPEC-ORBIS-P4-OVERLAY */
export function PageList({ cura, onSelect }: PageListProps): ReactElement {
  if (!cura) return <aside className={styles.pages}>Select a Cura to view recent pages.</aside>
  return (
    <aside className={styles.pages}>
      <h2>{cura.title}</h2>
      {cura.pages.map((page) => (
        <button className={styles.page} key={page.id} onClick={() => onSelect(page.id)}>
          <strong>{page.title}</strong>
          <span>{page.url}</span>
        </button>
      ))}
    </aside>
  )
}
