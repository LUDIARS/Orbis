export interface Bounds { x: number; y: number; width: number; height: number }
export interface WorkArea extends Bounds {}

/** @implements SPEC-ORBIS-P8-WINDOW-STATE 保存済み座標を現在の表示領域へ収める。 */
export function clampWindowBounds(saved: Bounds, workArea: WorkArea): Bounds {
  const width = Math.max(1, Math.min(saved.width, workArea.width))
  const height = Math.max(1, Math.min(saved.height, workArea.height))
  return {
    width,
    height,
    x: Math.max(workArea.x, Math.min(saved.x, workArea.x + workArea.width - width)),
    y: Math.max(workArea.y, Math.min(saved.y, workArea.y + workArea.height - height))
  }
}
