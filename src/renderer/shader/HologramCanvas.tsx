import { useEffect, useRef, type ReactElement } from 'react'
import { shouldAnimate } from './animation-visibility'
import { createShaderProgram } from './create-shader-program'
import { hologramFragmentSource } from './hologram-fragment'
import { createHologramRenderer } from './render-hologram'
import styles from './HologramCanvas.module.css'

interface HologramCanvasProps { intensity?: number }

/** @implements SPEC-ORBIS-UIRICH-SHADER SPEC-ORBIS-UIRICH-PERF
 * Decorative-only WebGL2 layer. A failed setup intentionally leaves its CSS parent visible.
 */
export function HologramCanvas({ intensity = 1 }: HologramCanvasProps): ReactElement {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(
    /** @implements SPEC-ORBIS-UIRICH-SHADER SPEC-ORBIS-UIRICH-PERF */
    () => {
      const canvas = ref.current
      if (!canvas) return
      const context = canvas.getContext('webgl2', { alpha: true })
      if (!context) return
      const program = createShaderProgram(context, hologramFragmentSource)
      if (!program) return
      const renderer = createHologramRenderer(context, program)
      if (!renderer) { context.deleteProgram(program); return }
      let frame = 0
      /** @implements SPEC-ORBIS-UIRICH-SHADER */
      const resize = (): void => {
        const scale = window.devicePixelRatio || 1
        canvas.width = Math.max(1, Math.floor(canvas.clientWidth * scale))
        canvas.height = Math.max(1, Math.floor(canvas.clientHeight * scale))
      }
      /** @implements SPEC-ORBIS-UIRICH-SHADER */
      const draw = (now: number): void => {
        if (context.isContextLost()) return
        renderer.render(now, intensity)
        frame = requestAnimationFrame(draw)
      }
      /** @implements SPEC-ORBIS-UIRICH-PERF */
      const sync = (): void => {
        cancelAnimationFrame(frame)
        if (shouldAnimate(!context.isContextLost(), document.visibilityState, document.hasFocus())) frame = requestAnimationFrame(draw)
      }
      const observer = new ResizeObserver(resize)
      observer.observe(canvas)
      resize(); sync()
      document.addEventListener('visibilitychange', sync)
      window.addEventListener('focus', sync)
      window.addEventListener('blur', sync)
      /** @implements SPEC-ORBIS-UIRICH-SHADER SPEC-ORBIS-UIRICH-PERF */
      const dispose = (): void => {
        cancelAnimationFrame(frame)
        observer.disconnect()
        document.removeEventListener('visibilitychange', sync)
        window.removeEventListener('focus', sync)
        window.removeEventListener('blur', sync)
        renderer.dispose()
      }
      return dispose
    },
    [intensity]
  )
  return <canvas ref={ref} aria-hidden="true" className={styles.canvas} />
}
