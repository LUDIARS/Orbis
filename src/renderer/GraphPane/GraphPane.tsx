import cytoscape from 'cytoscape'
import { useEffect, useRef, type ReactElement } from 'react'
import type { GraphLayout, GraphViewState } from '../../shared/ipc-contract'
import { timelineNodePositions } from './timeline-layout'
import styles from './GraphPane.module.css'

interface Props {
  state: GraphViewState
  hits: string[]
  layout: GraphLayout
  collapsed: boolean
  top: number
  onSelect(id: string): void
  onToggle(): void
}

/** @implements SPEC-ORBIS-P1-GRAPHPANE */
export function GraphPane({ state, hits, layout, collapsed, top, onSelect, onToggle }: Props): ReactElement {
  const graphElement = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = graphElement.current
    if (!container || collapsed) return
    const positions = new Map(timelineNodePositions(state.nodes).map((position) => [position.id, position]))
    const nodeIds = new Set(state.nodes.map((node) => node.id))
    const graph = cytoscape({
      container,
      elements: [
        ...state.nodes.map((node) => ({
          data: { id: node.id, label: node.title.slice(0, 24) },
          classes: [hits.includes(node.id) ? 'hit' : '', node.id === state.activePageId ? 'active' : '', node.umbra ? 'umbra' : '']
            .filter(Boolean)
            .join(' '),
          position: positions.get(node.id)
        })),
        ...state.edges
          .filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to))
          .map((edge) => ({
            data: { id: `${edge.from}:${edge.to}:${edge.kind}`, source: edge.from, target: edge.to, kind: edge.kind, count: edge.count }
          }))
      ],
      style: [
        { selector: 'node', style: { label: 'data(label)', color: '#eaf2ff', 'font-size': 10, 'text-valign': 'bottom', 'text-margin-y': 8, 'background-color': '#4c82d5', width: 36, height: 36 } },
        { selector: 'node.hit', style: { 'background-color': '#e264d3' } },
        { selector: 'node.active', style: { 'background-color': '#ffbd4a' } },
        { selector: 'edge', style: { width: 'mapData(count, 1, 5, 1, 5)', 'line-color': '#607d9c', 'target-arrow-color': '#607d9c', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier' } },
        { selector: 'edge[kind = "newview"]', style: { 'line-style': 'dashed' } },
        { selector: 'node.umbra', style: { opacity: 0.35 } },
        { selector: 'edge[kind = "llm"]', style: { 'line-style': 'dotted', 'line-color': '#9c6bd8', 'target-arrow-color': '#9c6bd8' } },
        { selector: 'edge[kind = "explore"]', style: { 'line-style': 'dashed', 'line-color': '#53c7ad', 'target-arrow-color': '#53c7ad', 'line-dash-pattern': [8, 5], 'line-dash-offset': 12 } }
      ]
    })
    graph.on('tap', 'node', (event) => onSelect(event.target.id()))
    graph.layout(layout === 'force'
      ? { name: 'cose', animate: false, padding: 30 }
      : { name: 'preset', fit: true, padding: 30 }
    ).run()
    return () => graph.destroy()
  }, [collapsed, hits, layout, onSelect, state])

  return (
    <aside className={`${styles.pane} ${collapsed ? styles.collapsed : ''}`} style={{ top }}>
      <button onClick={onToggle}>{collapsed ? '›' : '‹'}</button>
      {!collapsed && <div ref={graphElement} className={styles.graph} aria-label="Interest graph" />}
    </aside>
  )
}
