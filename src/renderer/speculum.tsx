import { createRoot } from 'react-dom/client'
import { useEffect, useState, type ReactElement } from 'react'
import { GraphPane } from './GraphPane/GraphPane'
import type { GraphViewState } from '../shared/ipc-contract'

/** @implements SPEC-ORBIS-P8-SPECULUM */
function Speculum(): ReactElement {
  const [state, setState] = useState<GraphViewState>({ nodes: [], edges: [], activePageId: null })
  useEffect(() => { const dispose = window.orbis.on('orbis:graph', setState); window.orbis.ready(); return dispose }, [])
  return <main style={{ width: '100%', height: '100%', background: '#101c2e' }}>
    <header style={{ height: 24, padding: '4px 10px', boxSizing: 'border-box', color: '#eaf2ff', font: '12px system-ui', WebkitAppRegion: 'drag' } as React.CSSProperties}>Speculum</header>
    <section style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
      <GraphPane state={state} hits={[]} layout="force" collapsed={false} top={24} onSelect={(id) => window.orbis.speculumSelect(id)} onToggle={() => undefined} />
    </section>
  </main>
}
createRoot(document.getElementById('root')!).render(<Speculum />)
