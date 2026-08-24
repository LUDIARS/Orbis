import { useEffect, useState, type ReactElement } from 'react'
import { channels, type FenestraViewState, type PageViewState } from '../../shared/ipc-contract'
import { AddressBar } from '../AddressBar/AddressBar'
import { PageTabs } from '../PageTabs/PageTabs'
import styles from './App.module.css'

/** @implements SPEC-ORBIS-P0-RENDERER */
export function App(): ReactElement {
  const [pages, setPages] = useState<PageViewState[]>([])
  const [activePageId, setActivePageId] = useState<string | null>(null)
  const [navigationError, setNavigationError] = useState<string | null>(null)
  const [fenestra, setFenestra] = useState<FenestraViewState>({ alwaysOnTop: false, opacity: 1 })
  const current = pages.find((page) => page.id === activePageId)

  useEffect(() => {
    const disposePages = window.orbis.on(channels.pages, (state) => {
      setPages(state.pages)
      setActivePageId(state.activePageId)
      setNavigationError(null)
    })
    const disposeError = window.orbis.on(channels.navigationError, setNavigationError)
    const disposeFenestra = window.orbis.on(channels.fenestraState, setFenestra)
    window.orbis.ready()
    return () => {
      disposePages()
      disposeError()
      disposeFenestra()
    }
  }, [])

  return (
    <main className={styles.shell}>
      <PageTabs pages={pages} activePageId={activePageId} />
      <AddressBar url={current?.url ?? ''} />
      <span className={styles.status} role={navigationError ? 'alert' : undefined}>
        {navigationError ?? `${fenestra.alwaysOnTop ? '📌 top ' : ''}${Math.round(fenestra.opacity * 100)}%`}
      </span>
    </main>
  )
}
