import { createRoot } from 'react-dom/client'
import { useEffect, useState, type ReactElement } from 'react'
import { GraphPane } from './GraphPane/GraphPane'
import type { GraphViewState } from '../shared/ipc-contract'
import styles from './Speculum.module.css'

/** @implements SPEC-ORBIS-P8-SPECULUM SPEC-ORBIS-UIRICH-TOKENS */
function Speculum(): ReactElement {
  const [state, setState] = useState<GraphViewState>({ nodes: [], edges: [], activePageId: null })
  useEffect(() => { const dispose = window.orbis.on('orbis:graph', setState); window.orbis.ready(); return dispose }, [])
  return <main className={styles.shell}>
    <header className={styles.header}>Speculum</header>
    <section className={styles.graph}>
      <GraphPane state={state} hits={[]} layout="force" collapsed={false} top={24} onSelect={(id) => window.orbis.speculumSelect(id)} onToggle={() => undefined} />
    </section>
  </main>
}
createRoot(document.getElementById('root')!).render(<Speculum />)
