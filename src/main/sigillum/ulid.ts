import { randomBytes } from 'node:crypto'

const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

function encode(value: bigint, size: number): string {
  let result = ''
  for (let index = 0; index < size; index += 1) {
    result = alphabet[Number(value & 31n)] + result
    value >>= 5n
  }
  return result
}

/** Generates a time-sortable, cryptographically random ULID. */
export function createUlid(now = Date.now()): string {
  const timestamp = encode(BigInt(now), 10)
  const entropy = BigInt(`0x${randomBytes(10).toString('hex')}`)
  return `${timestamp}${encode(entropy, 16)}`
}
