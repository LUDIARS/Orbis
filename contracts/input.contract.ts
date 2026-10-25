import type { WebContents } from 'electron'
export default {
  post: (result: { performed: string }, _webContents: WebContents, action: Record<string, unknown>): true | string => {
    if (action.type === 'type') return result.performed === `type(${String(action.text).length} chars)` || 'Input summaries must only contain length.'
    if (action.type === 'select') return result.performed === 'select' || 'Selection summaries must not contain page data.'
    return true
  }
}
