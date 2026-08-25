import { createServer, type IncomingMessage, type Server } from 'node:http'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { z } from 'zod'
import type { SigillumService } from '../sigillum/service.js'
import { AuditLog } from './audit.js'
import { bearerToken, clientIdHeader, hasValidToken, isLoopback } from './auth.js'
import type { VinculumOperations } from './operations.js'
import { attach } from './tools/attach.js'
import { detach } from './tools/detach.js'
import { navigate } from './tools/navigate.js'
import { open } from './tools/open.js'
import { read } from './tools/read.js'
import { act } from './tools/act.js'
import { logs } from './tools/logs.js'
import { search } from './tools/search.js'
import { toMemoria } from './tools/to-memoria.js'
import { reveal } from './tools/reveal.js'

const sigillumField = { sigillum: z.string().min(1) }
const result = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value) }] })
const MAX_REQUEST_BODY_BYTES = 1024 * 1024
const CLIENT_ID_HEADER = 'x-orbis-client-id'

class RequestBodyTooLargeError extends Error {}

/** @implements SPEC-ORBIS-P6-EXPLORATIO Identify the page capabilities that search created for its caller. */
function explorationSigilla(value: unknown): string[] {
  if (typeof value !== 'object' || value === null) return []
  const response = value as { searchSigillum?: unknown; results?: unknown }
  const sigilla = typeof response.searchSigillum === 'string' ? [response.searchSigillum] : []
  if (!Array.isArray(response.results)) return sigilla
  for (const item of response.results) {
    if (typeof item !== 'object' || item === null) continue
    const sigillum = (item as { sigillum?: unknown }).sigillum
    if (typeof sigillum === 'string') sigilla.push(sigillum)
  }
  return [...new Set(sigilla)]
}

/** @implements SPEC-ORBIS-P5-VINCULUM loopback + 共有トークン限定の MCP エンドポイント。Excubitor 照合は P6 (Cc 側 PR と同時に有効化)。 */
export class VinculumServer {
  private server: Server | undefined
  constructor(private readonly token: string, private readonly seals: SigillumService, private readonly audit: AuditLog, private readonly operations: VinculumOperations) {}

  async start(configDir: string): Promise<number> {
    if (this.server) throw new Error('Vinculum is already started.')
    const server = createServer(async (request, response) => {
      if (!this.authorized(request)) { response.writeHead(401).end(); return }
      try {
        const body = await this.body(request)
        // stateless モード: SDK の作法どおりリクエストごとに transport / server を作る。
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
        const mcp = new McpServer({ name: 'orbis-vinculum', version: '0.1.0' })
        this.registerTools(mcp)
        await mcp.connect(transport)
        response.once('close', () => {
          void transport.close().catch(() => undefined) // The peer may already have closed the stateless transport.
          void mcp.close().catch(() => undefined) // Best-effort cleanup after the HTTP response has gone away.
        })
        await transport.handleRequest(request, response, body)
      } catch (error) {
        console.error('Vinculum request failed.', error)
        if (!response.headersSent) {
          const status = error instanceof RequestBodyTooLargeError ? 413 : error instanceof SyntaxError ? 400 : 500
          response.writeHead(status).end()
        }
      }
    })
    this.server = server
    try {
      await new Promise<void>((resolve, reject) => {
        const onError = (error: Error): void => reject(error)
        server.once('error', onError)
        server.listen(0, '127.0.0.1', () => {
          server.removeListener('error', onError)
          resolve()
        })
      })
      const address = server.address()
      if (!address || typeof address === 'string') throw new Error('Vinculum did not receive a TCP port.')
      await mkdir(configDir, { recursive: true })
      await writeFile(join(configDir, 'vinculum.json'), JSON.stringify({ port: address.port }), 'utf8')
      return address.port
    } catch (error) {
      this.server = undefined
      if (server.listening) await new Promise<void>((resolve) => server.close(() => resolve()))
      throw error
    }
  }

  async stop(): Promise<void> {
    const server = this.server
    this.server = undefined
    if (!server?.listening) return
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }

  private registerTools(mcp: McpServer): void {
    const guarded = <T extends { sigillum: string }>(kind: string, handler: (args: T, clientId: string) => Promise<unknown> | unknown) => async (
      args: T,
      extra: { sessionId?: string; requestInfo?: { headers: Record<string, string | string[] | undefined> } }
    ) => {
      // Stateless transports do not provide a sessionId. Require a stable caller ID so attach ownership
      // cannot collapse to one shared "local" identity for every authenticated process.
      const clientId = extra.sessionId ?? clientIdHeader(extra.requestInfo?.headers[CLIENT_ID_HEADER])
      try {
        if (!clientId) throw new Error(`The ${CLIENT_ID_HEADER} header is required.`)
        const output = await handler(args, clientId)
        this.recordAudit(args.sigillum, `cc:${clientId}`, kind, output)
        return result(output)
      } catch (error) {
        // Error messages can contain page URLs, selectors, or local paths. Keep them in the response, not the persistent audit log.
        this.recordAudit(args.sigillum, `cc:${clientId ?? 'unidentified'}`, 'error', { tool: kind })
        return { content: [{ type: 'text' as const, text: error instanceof Error ? error.message : 'Operation failed.' }], isError: true }
      }
    }
    const attached = (sigillum: string, clientId: string): void => { if (!this.seals.isAttached(sigillum, clientId)) throw new Error('Sigillum is not attached by this client.') }
    mcp.registerTool('orbis_attach', { inputSchema: sigillumField }, guarded('attach', ({ sigillum }, clientId) => attach(sigillum, clientId, this.seals)))
    mcp.registerTool('orbis_detach', { inputSchema: sigillumField }, guarded('detach', ({ sigillum }, clientId) => { attached(sigillum, clientId); return detach(sigillum, this.seals) }))
    mcp.registerTool('orbis_navigate', { inputSchema: { ...sigillumField, url: z.string().url() } }, guarded('navigate', ({ sigillum, url }, clientId) => { attached(sigillum, clientId); return navigate(sigillum, url, this.operations) }))
    mcp.registerTool('orbis_open', { inputSchema: { ...sigillumField, url: z.string().url(), visible: z.boolean().default(false) } }, guarded('navigate', async ({ sigillum, url, visible }, clientId) => {
      attached(sigillum, clientId)
      const output = await open(sigillum, url, visible, this.operations) as { pageSigillum?: string }
      // 開いたページの pageSigillum は同じクライアントへ自動 attach し、続く navigate/read を許す。
      if (output.pageSigillum) this.seals.attach(output.pageSigillum, clientId)
      return output
    }))
    mcp.registerTool('orbis_read', { inputSchema: { ...sigillumField, mode: z.enum(['text', 'dom', 'a11y', 'screenshot']).default('text') } }, guarded('read', ({ sigillum, mode }, clientId) => { attached(sigillum, clientId); return read(sigillum, mode, this.operations) }))
    mcp.registerTool('orbis_act', { inputSchema: { ...sigillumField, action: z.record(z.string(), z.unknown()) } }, guarded('act', ({ sigillum, action }, clientId) => { attached(sigillum, clientId); return act(sigillum, action, this.operations) }))
    mcp.registerTool('orbis_logs', { inputSchema: { ...sigillumField, since: z.string().optional() } }, guarded('read', ({ sigillum, since }, clientId) => { attached(sigillum, clientId); return logs(sigillum, since, this.audit) }))
    mcp.registerTool('orbis_search', { inputSchema: { ...sigillumField, query: z.string().min(1).max(2048), engine: z.literal('google').optional(), depth: z.number().int().positive().optional(), maxPages: z.number().int().positive().optional() } }, guarded('search', async (args, clientId) => {
      attached(args.sigillum, clientId)
      const output = await search(args, this.operations)
      for (const sigillum of explorationSigilla(output)) {
        if (!this.seals.attach(sigillum, clientId)) throw new Error('Unable to attach an exploration page to this client.')
      }
      return output
    }))
    mcp.registerTool('orbis_toMemoria', { inputSchema: { ...sigillumField, kind: z.enum(['note', 'task']), selection: z.string().max(8192).optional(), summary: z.string().max(8192).optional() } }, guarded('toMemoria', (args, clientId) => {
      attached(args.sigillum, clientId)
      return toMemoria(args.sigillum, args.kind, args.selection, args.summary, this.operations)
    }))
    mcp.registerTool('orbis_reveal', { inputSchema: { ...sigillumField, userUtteranceId: z.string().min(1).max(256) } }, guarded('reveal', (args, clientId) => {
      attached(args.sigillum, clientId)
      return reveal(args.sigillum, args.userUtteranceId, this.operations)
    }))
  }

  private recordAudit(sigillum: string, actor: string, kind: string, payload: unknown): void {
    if (!this.seals.get(sigillum)) return
    try {
      this.audit.record(sigillum, actor, kind, payload)
    } catch (error) {
      // The browser operation may already have happened; an audit failure must not make callers retry it.
      console.error('Unable to record the Vinculum audit entry.', error)
    }
  }

  private authorized(request: IncomingMessage): boolean {
    // Process-level proof is advisory until Concordia publishes its service_detail contract.
    return isLoopback(request.socket.remoteAddress) && hasValidToken(bearerToken(request.headers.authorization), this.token)
  }

  private async body(request: IncomingMessage): Promise<unknown> {
    const declaredLength = Number(request.headers['content-length'] ?? 0)
    if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BODY_BYTES) throw new RequestBodyTooLargeError()
    const chunks: Buffer[] = []
    let received = 0
    for await (const chunk of request) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      received += buffer.byteLength
      if (received > MAX_REQUEST_BODY_BYTES) throw new RequestBodyTooLargeError()
      chunks.push(buffer)
    }
    const text = Buffer.concat(chunks).toString('utf8')
    return text ? JSON.parse(text) : undefined
  }
}
