import { useEffect, useState, type FormEvent, type ReactElement } from 'react'
import type { FenestraViewState, SigillumViewState, VitrumViewState } from '../../shared/ipc-contract'
import type { NavigationMode } from '../../shared/navigation-intent'
import styles from './PageControlBar.module.css'
import { HologramCanvas } from '../shader/HologramCanvas'
import { useWindowDrag } from './useWindowDrag'

/** @implements SPEC-ORBIS-BORDERLESS-CONTROL-MENU SPEC-ORBIS-VITRUM-ACTION SPEC-ORBIS-UIRICH-TOKENS SPEC-ORBIS-UIRICH-CSS SPEC-ORBIS-UIRICH-SHADER */
export function PageControlBar(): ReactElement {
  const [isOpen, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [mode, setMode] = useState<NavigationMode>('auto')
  const [sigillum, setSigillum] = useState<SigillumViewState>({ browser: null, page: null })
  const [fenestra, setFenestra] = useState<FenestraViewState>({ alwaysOnTop: false, opacity: 1 })
  const [vitrum, setVitrum] = useState<VitrumViewState | null>(null)
  const [vitrumError, setVitrumError] = useState<string | null>(null)
  const barDrag = useWindowDrag(undefined, true)
  const controlDrag = useWindowDrag(() => setOpen((open) => !open))
  const customVitrumId = vitrum && !vitrum.presets.includes(vitrum.spec.id) ? vitrum.spec.id : null

  useEffect(
    /** @implements SPEC-ORBIS-BORDERLESS-CONTROL-MENU SPEC-ORBIS-VITRUM-ACTION */
    () => {
      const disposePages = window.orbis.on('orbis:pages', (state) => {
        const page = state.pages.find((candidate) => candidate.id === state.activePageId)
        if (page) setValue(page.url)
      })
      const disposeFenestra = window.orbis.on('orbis:fenestra-state', setFenestra)
      window.orbis.ready()
      void window.orbis.sigillum().then(setSigillum)
      void window.orbis.vitrum()
        .then((state) => { setVitrum(state); setVitrumError(null) })
        .catch((reason: unknown) => setVitrumError(reason instanceof Error ? reason.message : '表示フィルタを取得できません。'))
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
    {isOpen && <HologramCanvas intensity={0.42} />}
    {isOpen && <form className={styles.menu} onSubmit={submit}>
      <button type="button" onClick={() => window.orbis.action('page.back')} aria-label="戻る">←</button>
      <button type="button" onClick={() => window.orbis.action('page.forward')} aria-label="進む">→</button>
      <button type="button" onClick={() => window.orbis.action('page.reload')} aria-label="再読み込み">↻</button>
      <select aria-label="表示フィルタ" value={vitrum?.spec.id ?? 'none'} onChange={(event) => { const id = event.target.value; void window.orbis.setVitrum({ id, filters: [] }).then((state) => { setVitrum(state); setVitrumError(null) }).catch((reason: unknown) => setVitrumError(reason instanceof Error ? reason.message : '表示フィルタを変更できません。')) }}>
        {customVitrumId && <option value={customVitrumId}>{customVitrumId}</option>}
        {(vitrum?.presets ?? ['none']).map((preset) => <option key={preset} value={preset}>{preset}</option>)}
      </select>
      {vitrumError && <output role="alert">{vitrumError}</output>}
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
