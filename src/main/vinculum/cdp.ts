import type { WebContents } from 'electron'

const debuggerQueues = new WeakMap<WebContents, Promise<void>>()

/** @implements SPEC-ORBIS-P5-VINCULUM CDP (webContents.debugger) 経由のページ読取と操作。Electron private API は使わない。 */
async function withDebugger<T>(webContents: WebContents, run: (send: (method: string, params?: Record<string, unknown>) => Promise<unknown>) => Promise<T>): Promise<T> {
  const previous = debuggerQueues.get(webContents) ?? Promise.resolve()
  let release = (): void => undefined
  const gate = new Promise<void>((resolve) => { release = resolve })
  const tail = previous.then(() => gate)
  debuggerQueues.set(webContents, tail)
  await previous
  try {
    const attachedBefore = webContents.debugger.isAttached()
    if (!attachedBefore) webContents.debugger.attach('1.3')
    try {
      return await run((method, params) => webContents.debugger.sendCommand(method, params))
    } finally {
      if (!attachedBefore && webContents.debugger.isAttached()) webContents.debugger.detach()
    }
  } finally {
    release()
    if (debuggerQueues.get(webContents) === tail) debuggerQueues.delete(webContents)
  }
}

export async function readOuterHtml(webContents: WebContents, limit = 64 * 1024): Promise<string> {
  return withDebugger(webContents, async (send) => {
    const document = await send('DOM.getDocument', { depth: 0 }) as { root: { nodeId: number } }
    const result = await send('DOM.getOuterHTML', { nodeId: document.root.nodeId }) as { outerHTML: string }
    return result.outerHTML.slice(0, limit)
  })
}

/** @implements SPEC-ORBIS-P6-ACCESSIBILITY Returns a bounded, serializable accessibility tree. */
export async function readAccessibilityTree(webContents: WebContents, limit = 500): Promise<unknown[]> {
  return withDebugger(webContents, async (send) => {
    const result = await send('Accessibility.getFullAXTree') as { nodes?: unknown[] }
    return (result.nodes ?? []).slice(0, limit)
  })
}

/**
 * 画面に出ていない非アクティブ view でも撮れるよう、compositor ではなく renderer から取る。
 * ウインドウへ attach していない Umbra view では応答が返らないことがあるため待ち時間で打ち切る。
 */
export async function captureScreenshotPng(webContents: WebContents, timeoutMs = 5000): Promise<string> {
  return withDebugger(webContents, async (send) => {
    const capture = send('Page.captureScreenshot', { format: 'png', fromSurface: false })
      .then((value) => (value as { data?: string }).data ?? '')
    let timer: NodeJS.Timeout | undefined
    const expiry = new Promise<string>((resolve) => { timer = setTimeout(() => resolve(''), timeoutMs) })
    try {
      return await Promise.race([capture, expiry])
    } finally {
      if (timer) clearTimeout(timer)
      capture.catch(() => undefined)
    }
  })
}

export interface ActSummary { performed: string }

export async function performAct(webContents: WebContents, action: Record<string, unknown>): Promise<ActSummary> {
  const type = action.type
  if (type === 'click') {
    const x = Number(action.x)
    const y = Number(action.y)
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('click requires numeric x and y.')
    return withDebugger(webContents, async (send) => {
      const base = { x, y, button: 'left', clickCount: 1 }
      await send('Input.dispatchMouseEvent', { ...base, type: 'mousePressed' })
      await send('Input.dispatchMouseEvent', { ...base, type: 'mouseReleased' })
      return { performed: `click(${x}, ${y})` }
    })
  }
  if (type === 'type') {
    const text = action.text
    if (typeof text !== 'string' || text.length === 0) throw new Error('type requires text.')
    return withDebugger(webContents, async (send) => {
      await send('Input.insertText', { text })
      return { performed: `type(${text.length} chars)` }
    })
  }
  if (type === 'scroll') {
    const deltaY = Number(action.deltaY ?? 400)
    if (!Number.isFinite(deltaY)) throw new Error('scroll requires a numeric deltaY.')
    // Input.dispatchMouseEvent(mouseWheel) は compositor の ack 待ちで返らないことがあるため scrollBy で行う。
    return withDebugger(webContents, async (send) => {
      await send('Runtime.evaluate', { expression: `window.scrollBy(0, ${deltaY})`, returnByValue: true })
      return { performed: `scroll(${deltaY})` }
    })
  }
  if (type === 'select') {
    const selector = action.selector
    const value = action.value
    if (typeof selector !== 'string' || typeof value !== 'string') throw new Error('select requires selector and value.')
    return withDebugger(webContents, async (send) => {
      const expression = `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return 'not_found'; el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('change', { bubbles: true })); return 'ok' })()`
      const result = await send('Runtime.evaluate', { expression, returnByValue: true }) as { result: { value?: unknown } }
      if (result.result.value !== 'ok') throw new Error('The selector did not match an element.')
      return { performed: `select(${selector})` }
    })
  }
  throw new Error('Unsupported action type. Use click / type / scroll / select.')
}
