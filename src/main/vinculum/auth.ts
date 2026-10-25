import { timingSafeEqual } from 'node:crypto'
import { contract } from '../../../contracts/contract-runtime.ts'; /* augur-inject:import:968aaf0d */
import augurContract_d537756c from '../../../contracts/token.contract.ts'; /* augur-inject:contract-predicate:4f201150 */

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/
const CLIENT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const INSTANCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/

/** @implements SPEC-ORBIS-VINCULUM-VAULT Vault is the only token authority; legacy DB rows are untouched. */
export function readToken(env: NodeJS.ProcessEnv = process.env): string {
  const token = env.ORBIS_VINCULUM_TOKEN
  if (!token) throw new Error('ORBIS_VINCULUM_TOKEN is required.')
  if (token.length !== 43 || !TOKEN_PATTERN.test(token)) throw new Error('ORBIS_VINCULUM_TOKEN must be 43 base64url characters.')
  return token
}
// @ts-expect-error augur-inject
readToken = contract(readToken, { ...augurContract_d537756c, contractId: 'C-1', mode: 'observe', sample: 1, where: 'src/main/vinculum/auth.ts:8', rule: 'contract-wrap', id: 'd537756c' }); /* augur-inject:contract-wrap:d537756c */

export function isLoopback(address: string | undefined): boolean { return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1' }
export function bearerToken(authorization: string | undefined): string | undefined {
  const match = authorization?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)
  return match?.[1]
}
export function clientIdHeader(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' && CLIENT_ID_PATTERN.test(value) ? value : undefined
}
/**
 * 接続元が名乗る Excubitor instance_id。 Excubitor の記録と照合するだけの値なので
 * 形だけ検証し、正しさの判断は peer-verification に任せる。
 * @implements SPEC-ORBIS-P6-VINCULUM-PEER
 */
export function instanceIdHeader(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' && INSTANCE_ID_PATTERN.test(value) ? value : undefined
}
export function hasValidToken(actual: string | undefined, expected: string): boolean {
  if (!actual) return false
  const left = Buffer.from(actual)
  const right = Buffer.from(expected)
  return left.length === right.length && timingSafeEqual(left, right)
}
