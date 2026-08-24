import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react'
import { channels, type RotaCuraView, type RotaSnapshot } from '../../shared/ipc-contract'
import { CuraWheel } from './CuraWheel'
import { PageList } from './PageList'
import { RotaSearch } from './RotaSearch'
import styles from './RotaApp.module.css'
import { nextWheelItemId } from './wheel-layout'

/** @implements SPEC-ORBIS-P4-ROTA SPEC-ORBIS-P4-OVERLAY */
export function RotaApp(): ReactElement {
  const [snapshot, setSnapshot] = useState<RotaSnapshot>({ curas: [] })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [rotation, setRotation] = useState(0)
  const selected = useMemo<RotaCuraView | null>(
    () => snapshot.curas.find((cura) => cura.id === selectedId) ?? null,
    [selectedId, snapshot.curas]
  )
  const selectCura = useCallback((curaId: string): void => setSelectedId(curaId), [])
  const selectPage = useCallback((pageId: string): void => {
    if (selected) window.orbis.rotaSelectPage(selected.id, pageId)
  }, [selected])
  const search = useCallback((query: string): void => window.orbis.rotaSearch(query), [])
  const rotateSelection = useCallback((direction: -1 | 1): void => {
    if (snapshot.curas.length === 0) return
    setSelectedId((current) => nextWheelItemId(snapshot.curas, current, direction))
    setRotation((value) => value - (direction * Math.PI * 2 / snapshot.curas.length))
  }, [snapshot.curas])

  useEffect(() => {
    const dispose = window.orbis.on(channels.rotaSnapshot, (next) => {
      setSnapshot(next)
      setSelectedId((current) => next.curas.some((cura) => cura.id === current) ? current : (next.curas[0]?.id ?? null))
      setRotation(0)
    })
    window.orbis.rotaReady()
    return dispose
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        window.orbis.rotaClose()
        return
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault()
        rotateSelection(-1)
        return
      }
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault()
        rotateSelection(1)
        return
      }
      if (event.key === 'Enter' && selected) {
        event.preventDefault()
        if (selected.pages[0]) selectPage(selected.pages[0].id)
        else window.orbis.rotaSelectCura(selected.id)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [rotateSelection, selectPage, selected])

  return (
    <main className={styles.overlay} onWheel={(event) => { if (event.deltaY !== 0) rotateSelection(event.deltaY < 0 ? -1 : 1) }}>
      <RotaSearch onSearch={search} />
      <CuraWheel curas={snapshot.curas} selectedId={selectedId} rotation={rotation} onSelect={selectCura} />
      <PageList cura={selected} onSelect={selectPage} />
    </main>
  )
}
