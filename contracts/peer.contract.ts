import type { DatabaseSync } from 'node:sqlite'
export default {
  post: (result: boolean, db: DatabaseSync, env: NodeJS.ProcessEnv = process.env): true | string => {
    if (env.ORBIS_VINCULUM_PEER_VERIFICATION === 'on') return result === true || 'Environment must enable verification.'
    const row = db.prepare("SELECT value FROM vinculum_config WHERE key = 'excubitor_verification'").get()
    return result === (row?.value === 'on') || 'DB verification setting must remain effective.'
  }
}
