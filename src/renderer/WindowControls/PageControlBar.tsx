import { useEffect, useState, type FormEvent, type ReactElement } from 'react'
import type { FenestraViewState, SigillumViewState } from '../../shared/ipc-contract'
import type { NavigationMode } from '../../shared/navigation-intent'
import styles from './PageControlBar.module.css'
import { useWindowDrag } from './useWindowDrag'

/** @implements SPEC-ORBIS-BORDERLESS-CONTROL-MENU */
export function PageControlBar(): ReactElement {
  const [isOpen, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [mode, setMode] = useState<NavigationMode>('auto')
  const [sigillum, setSigillum] = useState<SigillumViewState>({ browser: null, page: null })
  const [fenestra, setFenestra] = useState<FenestraViewState>({ alwaysOnTop: false, opacity: 1 })
  const barDrag = useWindowDrag(undefined, true)
  const controlDrag = useWindowDrag(() => setOpen((open) => !open))

  useEffect(
    /** @implements SPEC-ORBIS-BORDERLESS-CONTROL-MENU */
    () => {
      const disposePages = window.orbis.on('orbis:pages', (state) => {
        const page = state.pages.find((candidate) => candidate.id === state.activePageId)
        if (page) setValue(page.url)
      })
      const disposeFenestra = window.orbis.on('orbis:fenestra-state', setFenestra)
      window.orbis.ready()
      void window.orbis.sigillum().then(setSigillum)
      return () => { disposePages(); disposeFenestra() }
    },
    []
  )

  /** @implements SPEC-ORBIS-BORDERLESS-CONTROL-MENU */
  const submit = (event: FormEvent): void => {
    event.preventDefault()
    window.orbis.navigate(value, mode)
  }
  return <header className={`${styles.bar} ${isOpen ? styles.open : ''}`} {...barDrag}>
    {isOpen && <form className={styles.menu} onSubmit={submit}>
      <button type="button" onClick={() => window.orbis.action('page.back')} aria-label="戻る">←</button>
      <button type="button" onClick={() => window.orbis.action('page.forward')} aria-label="進む">→</button>
      <button type="button" onClick={() => window.orbis.action('page.reload')} aria-label="再読み込み">↻</button>
      <input aria-label="URL または検索語" value={value} onChange={(event) => setValue(event.target.value)} placeholder="URL / 検索" />
      <select aria-label="移動モード" value={mode} onChange={(event) => setMode(event.target.value as NavigationMode)}>
        <option value="auto">自動</option><option value="url">URL</option><option value="search">検索</option>
      </select>
      <output title="sigillum">{sigillum.page?.slice(0, 8) ?? '—'}</output>
      <button type="button" aria-pressed={fenestra.alwaysOnTop} onClick={() => window.orbis.action('fenestra.alwaysOnTop.toggle')} title="常に手前">◆</button>
      <button type="button" onClick={() => window.orbis.action('fenestra.minimize')} aria-label="最小化">—</button>
      <button type="button" onClick={() => window.orbis.action('fenestra.maximize.toggle')} aria-label="最大化を切替">□</button>
      <button type="button" className={styles.close} onClick={() => window.orbis.action('page.close')} aria-label="閉じる">×</button>
    </form>}
    <button
      type="button"
      className={styles.control}
      aria-label="ウインドウメニュー。ドラッグで移動"
      aria-expanded={isOpen}
      title="タップでメニュー / ドラッグで移動"
      {...controlDrag}
    >•••</button>
  </header>
}
