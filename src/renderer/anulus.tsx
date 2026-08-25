import { createRoot } from 'react-dom/client'
import { useEffect, useState, type FormEvent, type ReactElement } from 'react'
import { resolveNavigationTarget, type NavigationMode } from '../shared/navigation-intent'
import type { AnulusViewState } from '../shared/ipc-contract'

/** @implements SPEC-ORBIS-P8-ANULUS */
function Anulus(): ReactElement {
  const [value, setValue] = useState('')
  const [mode, setMode] = useState<NavigationMode>('auto')
  const [state, setState] = useState<AnulusViewState>({ activeCuraId: null, curas: [], pages: [] })
  useEffect(() => { const dispose = window.orbis.on('orbis:anulus-state', setState); window.orbis.ready(); return dispose }, [])
  const target = resolveNavigationTarget(value, mode)
  const visiblePages = state.pages.slice(0, 8)
  /** @implements SPEC-ORBIS-P8-ANULUS */
  const submit = (event: FormEvent): void => {
    event.preventDefault()
    if (!target || !state.activeCuraId) return
    window.orbis.anulusOpen(value, mode)
    setValue('')
  }
  return <main style={{ width: '100vw', height: '100vh', borderRadius: '50%', background: 'radial-gradient(circle,#243b62,#101827)', color: '#fff', display: 'grid', placeItems: 'center', WebkitAppRegion: 'drag' } as React.CSSProperties}>
    <form onSubmit={submit} style={{ width: '76%', display: 'grid', gap: 6, WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
      <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
        {state.curas.map((cura) => <button key={cura.id} type="button" aria-pressed={cura.active} title={cura.title} onClick={() => window.orbis.anulusSelectCura(cura.id)} style={{ borderColor: cura.color }}>{cura.title.slice(0, 8)}</button>)}
        <button type="button" aria-label="新しい Cura" onClick={() => window.orbis.anulusNewCura()}>＋</button>
      </div>
      <input aria-label="URL または検索語" value={value} onChange={(e) => setValue(e.target.value)} placeholder="URL / 検索" autoFocus />
      <div><button type="button" aria-pressed={mode === 'auto'} onClick={() => setMode('auto')}>自動</button><button type="button" aria-pressed={mode === 'url'} onClick={() => setMode('url')}>URL</button><button type="button" aria-pressed={mode === 'search'} onClick={() => setMode('search')}>検索</button><button disabled={!target || !state.activeCuraId}>開く</button><button type="button" onClick={() => window.orbis.speculumToggle()}>グラフ</button></div>
    </form>{visiblePages.map((page, index) => <button key={page.id} aria-label={page.title} title={page.title} onClick={() => window.orbis.speculumSelect(page.id)} style={{ position: 'absolute', left: `${50 + 43 * Math.cos(index * 2 * Math.PI / Math.max(1, visiblePages.length))}%`, top: `${50 + 43 * Math.sin(index * 2 * Math.PI / Math.max(1, visiblePages.length))}%`, transform: 'translate(-50%,-50%)', borderRadius: '50%', width: 28, height: 28, WebkitAppRegion: 'no-drag' } as React.CSSProperties}>{index + 1}</button>)}
  </main>
}
createRoot(document.getElementById('root')!).render(<Anulus />)
