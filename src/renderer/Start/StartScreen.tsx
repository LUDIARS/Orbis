import { useEffect, useRef, useState, type FormEvent, type ReactElement } from 'react'
import { resolveNavigationTarget, type NavigationMode } from '../../shared/navigation-intent'
import { NavigationModeToggle } from './NavigationModeToggle'
import styles from './StartScreen.module.css'

/**
 * @implements SPEC-ORBIS-P7-START-SCREEN
 * 新しい Cura (= 新しいセッション) と新規ページは、既定 URL を勝手に開かず
 * ここで行き先を聞く。 入力は URL か検索語かを自動判定し、ボタンで固定できる。
 */
export function StartScreen({ top, onSubmit }: {
  top: number
  onSubmit: (input: string, mode: NavigationMode) => void
}): ReactElement {
  const [value, setValue] = useState('')
  const [mode, setMode] = useState<NavigationMode>('auto')
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => input.current?.focus(), [])

  const target = resolveNavigationTarget(value, mode)
  /** @implements SPEC-ORBIS-P7-START-SCREEN Submit the resolved intent through the typed bridge. */
  const submit = (event: FormEvent): void => {
    event.preventDefault()
    if (target) onSubmit(value, mode)
  }

  return (
    <section className={styles.screen} style={{ top }} aria-label="スタート画面">
      <h1 className={styles.title}>Orbis</h1>
      <form className={styles.form} onSubmit={submit}>
        <div className={styles.row}>
          <input
            ref={input}
            className={styles.input}
            aria-label="URL または検索語"
            placeholder="URL を入力、または検索語を入力"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <button type="submit" disabled={!target}>開く</button>
        </div>
        <div className={styles.row}>
          <NavigationModeToggle mode={mode} input={value} onChange={setMode} idPrefix="start-mode" />
          <span className={styles.hint}>
            {target
              ? target.kind === 'url' ? `${target.value} を開きます` : `「${target.value}」を検索します`
              : 'URL でも検索語でも構いません'}
          </span>
        </div>
      </form>
    </section>
  )
}
