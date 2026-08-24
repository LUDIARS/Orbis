import { useEffect, useState, type FormEvent, type ReactElement } from 'react'
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

/** @implements SPEC-ORBIS-P0-RENDERER */
export function AddressBar({ url }: { url: string }): ReactElement {
  const [value, setValue] = useState(url)
  useEffect(() => setValue(url), [url])

  /** @implements SPEC-ORBIS-P0-NAVIGATION */
  const submit = (event: FormEvent): void => {
    event.preventDefault()
    if (value.trim()) window.orbis.navigate(value.trim())
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <button type="button" onClick={() => window.orbis.action('page.back')}>←</button>
      <button type="button" onClick={() => window.orbis.action('page.forward')}>→</button>
      <button type="button" onClick={() => window.orbis.action('page.reload')}>↻</button>
      <input aria-label="Address" value={value} onChange={(event) => setValue(event.target.value)} />
      <button type="submit">Go</button>
      <SigillumStamp />
    </form>
  )
}
