export interface WheelPosition {
  id: string
  angle: number
  x: number
  y: number
}

/** @implements SPEC-ORBIS-P4-ROTA */
export function nextWheelItemId(
  items: readonly { id: string }[],
  selectedId: string | null,
  direction: -1 | 1
): string | null {
  if (items.length === 0) return null
  const currentIndex = items.findIndex((item) => item.id === selectedId)
  if (currentIndex < 0) return items[0].id
  return items[(currentIndex + direction + items.length) % items.length].id
}

/** @implements SPEC-ORBIS-P4-ROTA SPEC-ORBIS-P4-OVERLAY */
export function wheelPositions(
  items: readonly { id: string }[],
  rotation: number,
  radius: number
): WheelPosition[] {
  if (items.length === 0) return []
  const step = (Math.PI * 2) / items.length
  return items.map((item, index) => {
    const angle = rotation + (step * index) - (Math.PI / 2)
    return { id: item.id, angle, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
  })
}
