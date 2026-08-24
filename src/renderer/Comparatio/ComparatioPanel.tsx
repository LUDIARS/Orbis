import type { ReactElement } from 'react'
import type { ComparatioViewState } from '../../shared/ipc-contract'

interface Props { className: string; state: ComparatioViewState; onToggle(): void }

/** @implements SPEC-ORBIS-P2-COMPARATIO */
export function ComparatioPanel({ className, state, onToggle }: Props): ReactElement {
  return <aside className={className} aria-label="Comparatio" data-open={state.open}>
    <button onClick={onToggle}>比較 {state.open ? 'を閉じる' : 'を開く'} ({state.products.length})</button>
    {state.open && <table><thead><tr><th>商品</th><th>価格</th><th>評価</th><th>レビュー</th><th>到着日</th><th>URL</th></tr></thead><tbody>
      {state.products.map((product) => <tr key={product.id}><td>{product.title}</td><td>{product.price ?? '—'}</td><td>{product.rating ?? '—'}</td><td>{product.reviewCount ?? '—'}</td><td>{product.delivery ?? '—'}</td><td><a href={product.url}>{product.url}</a></td></tr>)}
    </tbody></table>}
  </aside>
}
