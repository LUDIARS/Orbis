import type { AuditLog } from '../audit.js'
export function logs(sigillum: string, since: string | undefined, audit: AuditLog): unknown[] { return audit.list(sigillum, since) }
