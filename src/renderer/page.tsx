import { createRoot } from 'react-dom/client'
import { useEffect, useState, type FormEvent, type ReactElement } from 'react'
import type { SigillumViewState } from '../shared/ipc-contract'
import type { NavigationMode } from '../shared/navigation-intent'

/** @implements SPEC-ORBIS-P8-PAGE-WINDOW */
function PageBar(): ReactElement {
  const [value, setValue] = useState('')
  const [mode, setMode] = useState<NavigationMode>('auto')
  const [sigillum, setSigillum] = useState<SigillumViewState>({ browser: null, page: null })
  useEffect(() => {
    const dispose = window.orbis.on('orbis:pages', (state) => {
      const page = state.pages.find((candidate) => candidate.id === state.activePageId)
      if (page) setValue(page.url)
    })
    window.orbis.ready()
    void window.orbis.sigillum().then(setSigillum)
    return dispose
  }, [])
  /** @implements SPEC-ORBIS-P8-PAGE-WINDOW */
  const submit = (event: FormEvent): void => { event.preventDefault(); window.orbis.navigate(value, mode) }
  return <form onSubmit={submit} style={{ height: 42, display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px', boxSizing: 'border-box', background: '#182235', color: '#e9f1ff', fontFamily: 'system-ui' }}>
    <button type="button" onClick={() => window.orbis.action('page.back')}>←</button><button type="button" onClick={() => window.orbis.action('page.forward')}>→</button><button type="button" onClick={() => window.orbis.action('page.reload')}>↻</button>
    <input aria-label="URL または検索語" value={value} onChange={(event) => setValue(event.target.value)} placeholder="URL / 検索" style={{ flex: 1 }} />
    <select aria-label="移動モード" value={mode} onChange={(event) => setMode(event.target.value as NavigationMode)}><option value="auto">自動</option><option value="url">URL</option><option value="search">検索</option></select>
    <output title="sigillum">{sigillum.page?.slice(0, 8) ?? '—'}</output>
  </form>
}
createRoot(document.getElementById('root')!).render(<PageBar />)
