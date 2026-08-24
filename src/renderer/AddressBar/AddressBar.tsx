import { useEffect, useState, type FormEvent, type ReactElement } from 'react'
import styles from './AddressBar.module.css'

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
    </form>
  )
}
