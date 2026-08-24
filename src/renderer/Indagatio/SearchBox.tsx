import { useEffect, useRef, useState, type ReactElement } from 'react'
interface Props { onSearch(query: string): void; onSelectFirst(): void; focusToken: number }
/** @implements SPEC-ORBIS-P1-INDAGATIO */
export function SearchBox({ onSearch, onSelectFirst, focusToken }: Props): ReactElement {
  const [value, setValue] = useState(''); const input = useRef<HTMLInputElement>(null)
  useEffect(() => { input.current?.focus() }, [focusToken])
  return <input ref={input} aria-label="Search pages" placeholder="Search this Cura" value={value} onChange={(event) => { setValue(event.target.value); onSearch(event.target.value) }} onKeyDown={(event) => { if (event.key === 'Enter') onSelectFirst() }} />
}
