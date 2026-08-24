import { useEffect, useState, type ReactElement } from 'react'
import { channels, curaLayout, type ComparatioViewState, type FenestraViewState, type GraphLayout, type GraphViewState, type HabitusId, type PageViewState } from '../../shared/ipc-contract'
import { AddressBar } from '../AddressBar/AddressBar'
import { PageTabs } from '../PageTabs/PageTabs'
import { GraphPane } from '../GraphPane/GraphPane'
import { SearchBox } from '../Indagatio/SearchBox'
import { HabitusSwitcher } from '../HabitusSwitcher/HabitusSwitcher'
import { ComparatioPanel } from '../Comparatio/ComparatioPanel'
import styles from './App.module.css'

/** @implements SPEC-ORBIS-P0-RENDERER */
export function App(): ReactElement {
  const [pages, setPages] = useState<PageViewState[]>([])
  const [activePageId, setActivePageId] = useState<string | null>(null)
  const [navigationError, setNavigationError] = useState<string | null>(null)
  const [fenestra, setFenestra] = useState<FenestraViewState>({ alwaysOnTop: false, opacity: 1 })
  const [graph, setGraph] = useState<GraphViewState>({ nodes: [], edges: [], activePageId: null })
  const [hits, setHits] = useState<string[]>([])
  const [layout, setLayout] = useState<GraphLayout>('force')
  const [collapsed, setCollapsed] = useState(false)
  const [focusToken, setFocusToken] = useState(0)
  const [habitus, setHabitus] = useState<HabitusId>('desktop')
  const [comparatio, setComparatio] = useState<ComparatioViewState>({ open: false, products: [] })
  const current = pages.find((page) => page.id === activePageId)
  const contentTop = curaLayout.toolbarHeight + (comparatio.open
    ? curaLayout.comparatioPanelHeight
    : curaLayout.comparatioToggleHeight)

  useEffect(() => {
    const disposePages = window.orbis.on(channels.pages, (state) => {
      setPages(state.pages)
      setActivePageId(state.activePageId)
      setNavigationError(null)
    })
    const disposeError = window.orbis.on(channels.navigationError, setNavigationError)
    const disposeFenestra = window.orbis.on(channels.fenestraState, setFenestra)
    const disposeGraph = window.orbis.on(channels.graph, setGraph)
    const disposeSearch = window.orbis.on(channels.searchResult, (result) => setHits(result.pageIds))
    const disposeFocus = window.orbis.on(channels.focusSearch, () => setFocusToken((value) => value + 1))
    const disposeToggle = window.orbis.on(channels.toggleGraphLayout, () => {
      setLayout((value) => value === 'force' ? 'timeline' : 'force')
    })
    const disposeHabitus = window.orbis.on(channels.habitusState, (state) => setHabitus(state.id))
    const disposeComparatio = window.orbis.on(channels.comparatio, setComparatio)
    window.orbis.ready()
    return () => {
      disposePages()
      disposeError()
      disposeFenestra()
      disposeGraph()
      disposeSearch()
      disposeFocus()
      disposeToggle()
      disposeHabitus()
      disposeComparatio()
    }
  }, [])

  return (
    <main className={styles.shell}>
      <section className={styles.toolbar}>
        <PageTabs pages={pages} activePageId={activePageId} />
        <AddressBar url={current?.url ?? ''} />
        <SearchBox
          focusToken={focusToken}
          onSearch={(query) => window.orbis.search(query)}
          onSelectFirst={() => { if (hits[0]) window.orbis.selectPage(hits[0]) }}
        />
        <HabitusSwitcher value={habitus} onChange={(id) => { setHabitus(id); window.orbis.setHabitus(id) }} />
        <button onClick={() => { const next = layout === 'force' ? 'timeline' : 'force'; setLayout(next); window.orbis.setGraphLayout(next) }}>
          Layout
        </button>
      </section>
      <ComparatioPanel className={styles.comparatio} state={comparatio} onToggle={() => window.orbis.toggleComparatio()} />
      <GraphPane
        state={graph}
        hits={hits}
        layout={layout}
        collapsed={collapsed}
        top={contentTop}
        onSelect={(id) => window.orbis.selectPage(id)}
        onToggle={() => { const next = !collapsed; setCollapsed(next); window.orbis.setGraphPaneCollapsed(next) }}
      />
      <span className={styles.status} role={navigationError ? 'alert' : undefined}>
        {navigationError ?? `${fenestra.alwaysOnTop ? '📌 top ' : ''}${Math.round(fenestra.opacity * 100)}%`}
      </span>
    </main>
  )
}
