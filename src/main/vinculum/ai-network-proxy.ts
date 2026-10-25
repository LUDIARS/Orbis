import { createServer, request as httpRequest, type Server, type OutgoingHttpHeaders } from 'node:http'
import { connect, type Socket } from 'node:net'
import type { Duplex } from 'node:stream'
import type { AiOriginPolicy } from './ai-origin-policy.js'

/** @implements SPEC-ORBIS-AI-ONLY Transport backstop, including proxied WebRTC TCP. */
export class AiNetworkProxy {
  private server: Server | undefined
  private readonly sockets = new Set<Duplex>()

  constructor(private readonly policy: AiOriginPolicy) {}

  async start(): Promise<number> {
    if (this.server) throw new Error('AI network proxy is already running.')
    const server = createServer((incoming, outgoing) => {
      let target: URL
      try { target = new URL(incoming.url ?? '') }
      catch { outgoing.writeHead(403).end(); return }
      if (target.protocol !== 'http:' || !this.policy.allows(target.href)) {
        outgoing.writeHead(403).end(); return
      }
      const headers: OutgoingHttpHeaders = { ...incoming.headers, host: target.host, connection: 'close' }
      delete headers['proxy-authorization']
      delete headers['proxy-connection']
      const upstream = httpRequest(target, { method: incoming.method, headers }, (response) => {
        outgoing.writeHead(response.statusCode ?? 502, response.headers)
        response.pipe(outgoing)
      })
      upstream.on('socket', (socket) => this.track(socket))
      upstream.on('error', () => {
        if (!outgoing.headersSent) outgoing.writeHead(502).end()
        else outgoing.destroy()
      })
      incoming.on('aborted', () => upstream.destroy())
      outgoing.on('close', () => upstream.destroy())
      incoming.pipe(upstream)
    })
    this.server = server
    server.on('connection', (socket) => this.track(socket))
    server.on('clientError', (_error, socket) => socket.destroy())
    server.on('connect', (request, client, head) => {
      let target: URL
      try { target = new URL(`https://${request.url ?? ''}`) }
      catch { client.end('HTTP/1.1 403 Forbidden\r\n\r\n'); return }
      if (target.pathname !== '/' || target.search || target.hash || !this.policy.allows(target.href)) {
        client.end('HTTP/1.1 403 Forbidden\r\n\r\n'); return
      }
      const upstream = connect({ host: target.hostname.replace(/^\[|\]$/g, ''), port: Number(target.port || 443) })
      this.track(upstream)
      const closeBoth = (): void => { client.destroy(); upstream.destroy() }
      client.on('error', closeBoth)
      upstream.on('error', closeBoth)
      client.on('close', () => upstream.destroy())
      upstream.on('close', () => client.destroy())
      upstream.once('connect', () => {
        if (client.destroyed) { upstream.destroy(); return }
        client.write('HTTP/1.1 200 Connection Established\r\n\r\n')
        if (head.length) upstream.write(head)
        client.pipe(upstream).pipe(client)
      })
    })
    // Plain HTTP upgrade is deliberately unavailable; secure WebSockets use CONNECT.
    server.on('upgrade', (_request, socket) => socket.end('HTTP/1.1 403 Forbidden\r\n\r\n'))
    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject)
        server.listen(0, '127.0.0.1', () => { server.removeListener('error', reject); resolve() })
      })
      const address = server.address()
      if (!address || typeof address === 'string') throw new Error('AI proxy did not bind a port.')
      return address.port
    } catch (error) {
      await this.stop()
      throw error
    }
  }

  async stop(): Promise<void> {
    const server = this.server
    this.server = undefined
    for (const socket of this.sockets) socket.destroy()
    this.sockets.clear()
    if (server?.listening) await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve())
    })
  }

  private track(socket: Socket): void {
    this.sockets.add(socket)
    socket.setTimeout(60_000, () => socket.destroy())
    socket.once('close', () => this.sockets.delete(socket))
  }
}
