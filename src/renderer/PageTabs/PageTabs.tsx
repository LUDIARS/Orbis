import type { ReactElement } from 'react'
import type { PageViewState } from '../../shared/ipc-contract'
import styles from './PageTabs.module.css'

/** @implements SPEC-ORBIS-P0-RENDERER */
export function PageTabs({
  pages,
  activePageId
}: {
  pages: PageViewState[]
  activePageId: string | null
}): ReactElement {
  return (
    <div className={styles.tabs}>
      {pages.map((page) => (
        <button
          type="button"
          className={`${styles.tab} ${page.id === activePageId ? styles.active : ''}`}
          key={page.id}
          title={page.url}
          onClick={() => window.orbis.selectPage(page.id)}
        >
          {page.title || page.url}
        </button>
      ))}
      <button type="button" onClick={() => window.orbis.action('page.new')}>＋</button>
      <button type="button" onClick={() => window.orbis.action('page.close')}>×</button>
      <button type="button" onClick={() => window.orbis.action('cura.new')}>New Cura</button>
    </div>
  )
}
