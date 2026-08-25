import { useEffect, useState, type FormEvent, type ReactElement } from 'react'
import { resolveNavigationTarget, type NavigationMode } from '../../shared/navigation-intent'
import { NavigationModeToggle } from '../Start/NavigationModeToggle'
import styles from './AddressBar.module.css'

/** @implements SPEC-ORBIS-P5-SIGILLUM アドレスバー右端のスタンプ。pageSigillum をクリップボードへコピーする。 */
function SigillumStamp(): ReactElement {
  const [copied, setCopied] = useState(false)
  const copy = async (): Promise<void> => {
    const state = await window.orbis.sigillum()
    if (!state.page) return
    await navigator.clipboard.writeText(state.page)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button type="button" title="Copy the page sigillum" aria-label="Copy the page sigillum" onClick={() => { void copy().catch(() => setCopied(false)) }}>
      {copied ? '✓' : '🪪'}
    </button>
  )
}

/** @implements SPEC-ORBIS-P0-RENDERER SPEC-ORBIS-P7-START-SCREEN */
export function AddressBar({ url }: { url: string }): ReactElement {
  const [value, setValue] = useState(url)
  const [mode, setMode] = useState<NavigationMode>('auto')
  useEffect(() => setValue(url), [url])

  const target = resolveNavigationTarget(value, mode)

  /** @implements SPEC-ORBIS-P0-NAVIGATION SPEC-ORBIS-P7-START-SCREEN */
  const submit = (event: FormEvent): void => {
    event.preventDefault()
    if (target) window.orbis.navigate(value.trim(), mode)
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <button type="button" onClick={() => window.orbis.action('page.back')}>←</button>
      <button type="button" onClick={() => window.orbis.action('page.forward')}>→</button>
      <button type="button" onClick={() => window.orbis.action('page.reload')}>↻</button>
      <input
        aria-label="Address"
        placeholder="URL を入力、または検索語を入力"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <NavigationModeToggle mode={mode} input={value} onChange={setMode} idPrefix="address-mode" />
      <button type="submit" disabled={!target}>{target?.kind === 'search' ? '検索' : 'Go'}</button>
      <SigillumStamp />
    </form>
  )
}
