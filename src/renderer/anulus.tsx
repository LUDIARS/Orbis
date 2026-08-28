import { createRoot } from 'react-dom/client'
import { useEffect, useState, type FormEvent, type ReactElement } from 'react'
import { resolveNavigationTarget, type NavigationMode } from '../shared/navigation-intent'
import type { AnulusViewState } from '../shared/ipc-contract'
import { HologramCanvas } from './shader/HologramCanvas'
import styles from './Anulus.module.css'

/** @implements SPEC-ORBIS-P8-ANULUS SPEC-ORBIS-UIRICH-TOKENS SPEC-ORBIS-UIRICH-CSS SPEC-ORBIS-UIRICH-SHADER SPEC-ORBIS-UIRICH-PERF */
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
  return <main className={styles.anulus}>
    <HologramCanvas />
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.curaList}>
        {state.curas.map((cura) => <button key={cura.id} type="button" aria-pressed={cura.active} title={cura.title} onClick={() => window.orbis.anulusSelectCura(cura.id)} style={{ borderColor: cura.color }}>{cura.title.slice(0, 8)}</button>)}
        <button type="button" aria-label="新しい Cura" onClick={() => window.orbis.anulusNewCura()}>＋</button>
      </div>
      <input aria-label="URL または検索語" value={value} onChange={(e) => setValue(e.target.value)} placeholder="URL / 検索" autoFocus />
      <div><button type="button" aria-pressed={mode === 'auto'} onClick={() => setMode('auto')}>自動</button><button type="button" aria-pressed={mode === 'url'} onClick={() => setMode('url')}>URL</button><button type="button" aria-pressed={mode === 'search'} onClick={() => setMode('search')}>検索</button><button disabled={!target || !state.activeCuraId}>開く</button><button type="button" onClick={() => window.orbis.speculumToggle()}>グラフ</button></div>
    </form>{visiblePages.map((page, index) => <button key={page.id} className={styles.page} aria-label={page.title} title={page.title} onClick={() => window.orbis.speculumSelect(page.id)} style={{ left: `${50 + 43 * Math.cos(index * 2 * Math.PI / Math.max(1, visiblePages.length))}%`, top: `${50 + 43 * Math.sin(index * 2 * Math.PI / Math.max(1, visiblePages.length))}%`, transform: 'translate(-50%,-50%)' }}>{index + 1}</button>)}
  </main>
}
createRoot(document.getElementById('root')!).render(<Anulus />)
