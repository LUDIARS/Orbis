import { createServer, request, type Server } from 'node:http'
import { connect } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { AiNetworkProxy } from '../src/main/vinculum/ai-network-proxy.js'
import { AiOriginPolicy } from '../src/main/vinculum/ai-origin-policy.js'

const cleanup: (() => Promise<void>)[] = []
afterEach(async () => { for (const stop of cleanup.splice(0).reverse()) await stop() })
async function listen(server: Server): Promise<number> {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  cleanup.push(() => new Promise<void>((resolve) => { server.close(() => resolve()); server.closeAllConnections() }))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No listening address')
  return address.port
}
async function get(proxyPort: number, url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const outgoing = request({ host: '127.0.0.1', port: proxyPort, path: url }, (response) => {
      response.resume()
      response.once('end', () => resolve(response.statusCode ?? 0))
    })
    outgoing.on('error', reject)
    outgoing.end()
  })
}
describe('AI transport boundary', () => {
  it('forwards only the configured loopback service; blocks other ports and remote destinations', async () => {
    let received = 0
    const target = createServer((_request, response) => { received++; response.end('allowed') })
    const port = await listen(target)
    const proxy = new AiNetworkProxy(new AiOriginPolicy([`http://127.0.0.1:${port}`]))
    const proxyPort = await proxy.start()
    cleanup.push(() => proxy.stop())
    expect(await get(proxyPort, `http://127.0.0.1:${port}/test`)).toBe(200)
    expect(await get(proxyPort, 'http://127.0.0.1:1/')).toBe(403)
    expect(await get(proxyPort, 'http://example.invalid/')).toBe(403)
    expect(received).toBe(1)
  })
  it('refuses CONNECT outside the HTTPS allowlist before opening a connection', async () => {
    const proxy = new AiNetworkProxy(new AiOriginPolicy(['https://cc.ai-run-do.com']))
    const port = await proxy.start()
    cleanup.push(() => proxy.stop())
    const response = await new Promise<string>((resolve, reject) => {
      const socket = connect(port, '127.0.0.1', () => socket.write('CONNECT example.invalid:443 HTTP/1.1\r\nHost: example.invalid\r\n\r\n'))
      socket.on('error', reject)
      socket.once('data', (chunk) => { resolve(chunk.toString('utf8')); socket.destroy() })
    })
    expect(response).toContain('403 Forbidden')
  })
})
