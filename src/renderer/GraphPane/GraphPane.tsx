import { type ReactElement } from 'react'
import type { GraphLayout, GraphViewState } from '../../shared/ipc-contract'
import styles from './GraphPane.module.css'

interface Props { state: GraphViewState; hits: string[]; layout: GraphLayout; collapsed: boolean; onSelect(id: string): void; onToggle(): void }
/** @implements SPEC-ORBIS-P1-GRAPHPANE */
export function GraphPane({ state, hits, layout, collapsed, onSelect, onToggle }: Props): ReactElement {
  const positions = new Map(state.nodes.map((node, index) => { const angle = layout === 'force' ? (index / Math.max(state.nodes.length, 1)) * Math.PI * 2 : 0; return [node.id, layout === 'force' ? { x: 145 + Math.cos(angle) * 105, y: 200 + Math.sin(angle) * 150 } : { x: 35 + (index % 3) * 115, y: 50 + Math.floor(index / 3) * 85 }] }))
  return <aside className={`${styles.pane} ${collapsed ? styles.collapsed : ''}`}><button onClick={onToggle}>{collapsed ? '›' : '‹'}</button>{!collapsed && <svg className={styles.graph} viewBox="0 0 300 420">{state.edges.map((edge) => { const from = positions.get(edge.from); const to = positions.get(edge.to); return from && to ? <line key={`${edge.from}-${edge.to}-${edge.kind}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#607d9c" strokeWidth={Math.min(5, edge.count)} /> : null })}{state.nodes.map((node) => { const point = positions.get(node.id); if (!point) return null; const fill = node.id === state.activePageId ? '#ffbd4a' : hits.includes(node.id) ? '#e264d3' : '#4c82d5'; return <g key={node.id} onClick={() => onSelect(node.id)}><circle cx={point.x} cy={point.y} r="18" fill={fill} /><text x={point.x} y={point.y + 32} textAnchor="middle" fill="#eaf2ff" fontSize="9">{node.title.slice(0, 16)}</text></g> })}</svg>}</aside>
}
