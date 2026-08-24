import { useEffect, useState, type ReactElement } from 'react'
import styles from './RotaApp.module.css'

interface RotaSearchProps {
  onSearch(query: string): void
}

/** @implements SPEC-ORBIS-P4-OVERLAY */
export function RotaSearch({ onSearch }: RotaSearchProps): ReactElement {
  const [query, setQuery] = useState('')
  useEffect(() => {
    const timer = window.setTimeout(() => onSearch(query), 120)
    return () => window.clearTimeout(timer)
  }, [query, onSearch])
  return <input className={styles.search} autoFocus placeholder="Search pages" value={query} onChange={(event) => setQuery(event.target.value)} />
}
