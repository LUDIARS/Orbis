import { contract } from '../../../contracts/contract-runtime.ts'; /* augur-inject:import:9bff9b08 */
import augurContract_e5e68a7f from '../../../contracts/port.contract.ts'; /* augur-inject:contract-predicate:681f4d58 */
/** @implements SPEC-ORBIS-VINCULUM-VAULT The service-owned catalog supplies the fixed loopback port. */
export function vinculumPort(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.ORBIS_VINCULUM_PORT
  if (!raw) throw new Error('ORBIS_VINCULUM_PORT is required.')
  const port = Number(raw)
  if (!/^\d+$/.test(raw) || raw.trim() !== raw || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('ORBIS_VINCULUM_PORT must be an integer from 1 to 65535.')
  }
  return port
}
// @ts-expect-error augur-inject
vinculumPort = contract(vinculumPort, { ...augurContract_e5e68a7f, contractId: 'C-2', mode: 'observe', sample: 1, where: 'src/main/vinculum/port.ts:2', rule: 'contract-wrap', id: 'e5e68a7f' }); /* augur-inject:contract-wrap:e5e68a7f */
