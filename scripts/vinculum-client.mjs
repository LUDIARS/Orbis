// Vinculum のローカル動作確認クライアント (設計書 §7.7 P5 の完了条件)。
// 使い方: node scripts/vinculum-client.mjs <browserSigillum> [url] [nextUrl]
//   sigillum はアドレスバーのスタンプ (pageSigillum) か、browserSigillum を渡す。
//   トークンは既定で Tabularium (orbis.sqlite) から読み、ORBIS_VINCULUM_TOKEN で上書きできる。
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const [sigillum, url = 'https://example.com', nextUrl = 'https://www.iana.org/domains/example'] = process.argv.slice(2)
if (!sigillum) {
  console.error('Usage: node scripts/vinculum-client.mjs <sigillum> [url] [nextUrl]')
  process.exit(1)
}

const userData = process.env.ORBIS_USER_DATA
  ?? join(process.env.APPDATA ?? join(process.env.HOME ?? '.', '.config'), 'orbis')
const { port } = JSON.parse(readFileSync(join(userData, 'vinculum.json'), 'utf8'))
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error('vinculum.json contains an invalid port.')
}

function loadToken() {
  if (process.env.ORBIS_VINCULUM_TOKEN) return process.env.ORBIS_VINCULUM_TOKEN
  const db = new DatabaseSync(join(userData, 'orbis.sqlite'), { readOnly: true })
  try {
    return db.prepare("SELECT value FROM vinculum_config WHERE key = 'token'").get()?.value
  } finally {
    db.close()
  }
}
const token = loadToken()
if (!token) {
  console.error('No Vinculum token found. Start Orbis once, or set ORBIS_VINCULUM_TOKEN.')
  process.exit(1)
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const clientId = randomUUID()
const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/`), {
  requestInit: { headers: { authorization: `Bearer ${token}`, 'x-orbis-client-id': clientId } }
})
const client = new Client({ name: 'vinculum-client', version: '0.1.0' })
await client.connect(transport)

const call = async (name, args) => {
  const result = await client.callTool({ name, arguments: args })
  const text = result.content?.[0]?.text ?? ''
  const value = (() => { try { return JSON.parse(text) } catch { return text } })()
  if (value && typeof value === 'object' && 'base64' in value && typeof value.base64 === 'string') {
    value.base64 = `${value.base64.slice(0, 32)}… (${value.base64.length} chars)`
  }
  console.log(`\n== ${name}${result.isError ? ' (error)' : ''}`)
  console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2))
  if (result.isError) throw new Error(`${name} failed: ${text}`)
  return value
}

await call('orbis_attach', { sigillum })
const opened = await call('orbis_open', { sigillum, url, visible: false })
await sleep(3000)
await call('orbis_navigate', { sigillum: opened.pageSigillum, url: nextUrl })
await sleep(3000)
await call('orbis_read', { sigillum: opened.pageSigillum, mode: 'text' })
await call('orbis_read', { sigillum: opened.pageSigillum, mode: 'screenshot' })
await call('orbis_logs', { sigillum: opened.pageSigillum })
await call('orbis_detach', { sigillum: opened.pageSigillum })
await call('orbis_detach', { sigillum })
await client.close()
console.log('\nAll Vinculum calls completed.')
