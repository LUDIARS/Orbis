export interface Point { x: number; y: number; at: number }
export interface RecognizerOptions { minimumDistance?: number; timeoutMs?: number }
const directions = ['R', 'DR', 'D', 'DL', 'L', 'UL', 'U', 'UR'] as const

/** @implements SPEC-ORBIS-P3-GESTUS */
export function recognizeGesture(points: Point[], options: RecognizerOptions = {}): string | null {
  if (points.length < 2) return null
  const minimumDistance = options.minimumDistance ?? 24
  const timeoutMs = options.timeoutMs ?? 1500
  if (points.at(-1)!.at - points[0].at > timeoutMs) return null
  let anchor = points[0]
  const strokes: string[] = []
  for (const point of points.slice(1)) {
    const dx = point.x - anchor.x
    const dy = point.y - anchor.y
    if (Math.hypot(dx, dy) < minimumDistance) continue
    const direction = directionFor(dx, dy)
    if (strokes.at(-1) !== direction) strokes.push(direction)
    anchor = point
  }
  return strokes.join('') || null
}

/** @implements SPEC-ORBIS-P3-GESTUS */
export function directionFor(dx: number, dy: number): typeof directions[number] {
  const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360
  return directions[Math.round(angle / 45) % directions.length]
}
