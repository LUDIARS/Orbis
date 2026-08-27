import { ipcMain, type BrowserWindow, type IpcMainEvent, type WebContents } from 'electron'
import { channels, type WindowDragInput } from '../../../shared/ipc-contract.js'

const MAX_COORDINATE = 1_000_000

interface DragSession {
  windowId: number
  pointerX: number
  pointerY: number
  windowX: number
  windowY: number
}

/** @implements SPEC-ORBIS-BORDERLESS-WINDOW-DRAG */
function isDragInput(value: unknown): value is WindowDragInput {
  if (typeof value !== 'object' || value === null) return false
  const input = value as WindowDragInput
  return (input.phase === 'begin' || input.phase === 'move' || input.phase === 'end')
    && Number.isFinite(input.screenX) && Math.abs(input.screenX) <= MAX_COORDINATE
    && Number.isFinite(input.screenY) && Math.abs(input.screenY) <= MAX_COORDINATE
}

/** @implements SPEC-ORBIS-BORDERLESS-WINDOW-DRAG */
export function registerWindowDragHandler(
  resolveWindow: (senderId: number) => BrowserWindow | undefined
): () => void {
  const sessions = new Map<number, DragSession>()
  const destroyListeners = new Map<WebContents, () => void>()
  /** @implements SPEC-ORBIS-BORDERLESS-WINDOW-DRAG */
  const observeSender = (sender: WebContents): void => {
    if (destroyListeners.has(sender)) return
    /** @implements SPEC-ORBIS-BORDERLESS-WINDOW-DRAG */
    const onDestroyed = (): void => {
      sessions.delete(sender.id)
      destroyListeners.delete(sender)
    }
    destroyListeners.set(sender, onDestroyed)
    sender.once('destroyed', onDestroyed)
  }
  /** @implements SPEC-ORBIS-BORDERLESS-WINDOW-DRAG */
  const listener = (event: IpcMainEvent, value: unknown): void => {
    if (!isDragInput(value)) return
    const senderId = event.sender.id
    const window = resolveWindow(senderId)
    if (!window || window.isDestroyed()) {
      sessions.delete(senderId)
      return
    }
    if (value.phase === 'begin') {
      const [windowX, windowY] = window.getPosition()
      sessions.set(senderId, {
        windowId: window.id,
        pointerX: value.screenX,
        pointerY: value.screenY,
        windowX,
        windowY
      })
      observeSender(event.sender)
      return
    }
    const session = sessions.get(senderId)
    if (!session || session.windowId !== window.id) return
    if (value.phase === 'end') {
      sessions.delete(senderId)
      return
    }
    window.setPosition(
      Math.round(session.windowX + value.screenX - session.pointerX),
      Math.round(session.windowY + value.screenY - session.pointerY)
    )
  }
  ipcMain.on(channels.windowDrag, listener)
  /** @implements SPEC-ORBIS-BORDERLESS-WINDOW-DRAG */
  return () => {
    ipcMain.removeListener(channels.windowDrag, listener)
    sessions.clear()
    for (const [sender, onDestroyed] of destroyListeners) {
      if (!sender.isDestroyed()) sender.removeListener('destroyed', onDestroyed)
    }
    destroyListeners.clear()
  }
}
