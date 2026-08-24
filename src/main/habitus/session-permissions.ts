import type { Session } from 'electron'

/** @implements SPEC-ORBIS-P2-HABITUS */
export function denySessionPermissions(target: Session): () => void {
  target.setPermissionCheckHandler(() => false)
  target.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))
  return () => {
    target.setPermissionCheckHandler(null)
    target.setPermissionRequestHandler(null)
  }
}
