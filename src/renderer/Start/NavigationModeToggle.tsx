import type { ReactElement } from 'react'
import { looksLikeUrl, type NavigationMode } from '../../shared/navigation-intent'

const labels: Record<NavigationMode, string> = { auto: '自動', url: 'URL', search: '検索' }
const order: NavigationMode[] = ['auto', 'url', 'search']

/**
 * @implements SPEC-ORBIS-P7-START-SCREEN
 * 自動判定を既定にし、外したいときだけ URL / 検索へ固定できるボタン。
 * 自動のときは「いまどちらに倒れているか」を併記して、押す前に分かるようにする。
 */
export function NavigationModeToggle({ mode, input, onChange, idPrefix }: {
  mode: NavigationMode
  input: string
  onChange: (mode: NavigationMode) => void
  idPrefix: string
}): ReactElement {
  const guessed = looksLikeUrl(input) ? 'URL' : '検索'
  return (
    <div role="group" aria-label="入力の扱い">
      {order.map((candidate) => (
        <button
          key={candidate}
          id={`${idPrefix}-${candidate}`}
          type="button"
          aria-pressed={mode === candidate}
          title={candidate === 'auto' ? `自動判定 (いまの入力は ${guessed} として扱われます)` : `${labels[candidate]} として扱う`}
          onClick={() => onChange(candidate)}
        >
          {candidate === 'auto' && input.trim() ? `${labels[candidate]}: ${guessed}` : labels[candidate]}
        </button>
      ))}
    </div>
  )
}
