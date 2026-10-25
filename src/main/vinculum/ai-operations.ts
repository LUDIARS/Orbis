import { randomUUID } from 'node:crypto'
import type { BrowserWindow, Session, WebContents } from 'electron'
import type { SigillumService } from '../sigillum/service.js'
import { createAiPage } from '../umbra/ai-page.js'
import { performAct, readAccessibilityTree, readOuterHtml } from './cdp.js'
import type { VinculumOperations } from './operations.js'
import type { AiOriginPolicy } from './ai-origin-policy.js'

const MAX_PAGES = 16

/** @implements SPEC-ORBIS-AI-ONLY Cc operations own the complete lifetime of AI pages. */
export class AiVinculumOperations implements VinculumOperations {
  private readonly pages = new Map<string, BrowserWindow>()
  private pendingPages = 0
  private disposed = false

  constructor(
    private readonly seals: SigillumService,
    private readonly curaId: string,
    private readonly target: Session,
    private readonly policy: AiOriginPolicy
  ) {}

  async open(sigillum: string, url: string, visible: boolean): Promise<unknown> {
    this.requireSeal(sigillum)
    if (visible) throw new Error('AI-only pages cannot be made visible.')
    const destination = this.policy.requireNavigation(url)
    if (this.pages.size + this.pendingPages >= MAX_PAGES) throw new Error('Close an AI page before opening another (limit 16).')
    this.pendingPages++
    let window: BrowserWindow | undefined
    const pageId = randomUUID()
    try {
      window = await createAiPage(this.target, this.policy)
      if (this.disposed) throw new Error('AI browser is stopping.')
      this.pages.set(pageId, window)
      window.once('closed', () => {
        this.pages.delete(pageId)
        if (!this.disposed) this.seals.revokePage(this.curaId, pageId)
      })
      const pageSigillum = this.seals.forPage(this.curaId, pageId)
      await this.load(window.webContents, destination)
      return { pageId, pageSigillum, umbra: true, mode: 'ai-only' }
    } catch (error) {
      if (window && !window.isDestroyed()) window.destroy()
      throw error
    } finally { this.pendingPages-- }
  }

  async navigate(sigillum: string, url: string): Promise<unknown> {
    const contents = this.contents(sigillum)
    await this.load(contents, this.policy.requireNavigation(url))
    return { navigated: contents.getURL() }
  }

  async read(sigillum: string, mode: 'text' | 'dom' | 'a11y' | 'screenshot'): Promise<unknown> {
    const contents = this.contents(sigillum)
    const info = { mode, url: contents.getURL(), title: contents.getTitle() }
    if (mode === 'text') return { ...info, text: await contents.executeJavaScript('document.body?.innerText.slice(0, 65536) ?? ""') }
    if (mode === 'dom') return { ...info, html: await readOuterHtml(contents) }
    if (mode === 'a11y') return { ...info, nodes: await readAccessibilityTree(contents) }
    const capture = await contents.capturePage()
    if (capture.isEmpty()) throw new Error('AI page screenshot is not available yet.')
    return { ...info, mimeType: 'image/png', base64: capture.toPNG().toString('base64') }
  }

  async act(sigillum: string, action: Record<string, unknown>): Promise<unknown> {
    return performAct(this.contents(sigillum), action)
  }

  async close(sigillum: string): Promise<unknown> {
    const record = this.requireSeal(sigillum)
    this.contents(sigillum)
    this.pages.get(record.pageId as string)?.destroy()
    return { closed: true }
  }

  async search(): Promise<never> { throw new Error('External search is disabled in AI-only mode.') }
  async reveal(): Promise<never> { throw new Error('AI-only pages cannot be revealed to humans.') }
  async toMemoria(): Promise<never> { throw new Error('Use Cc to explicitly transfer AI test results.') }

  dispose(): void {
    this.disposed = true
    for (const window of this.pages.values()) if (!window.isDestroyed()) window.destroy()
    this.pages.clear()
  }

  private requireSeal(sigillum: string) {
    if (this.disposed) throw new Error('AI browser is stopping.')
    const record = this.seals.get(sigillum)
    if (!record?.active || record.curaId !== this.curaId) throw new Error('Unknown or inactive AI sigillum.')
    return record
  }

  private contents(sigillum: string): WebContents {
    const record = this.requireSeal(sigillum)
    const window = record.pageId ? this.pages.get(record.pageId) : undefined
    if (!window || window.isDestroyed()) throw new Error('This operation requires an open AI page sigillum.')
    return window.webContents
  }

  private async load(contents: WebContents, url: string): Promise<void> {
    const timeout = setTimeout(() => { if (!contents.isDestroyed()) contents.stop() }, 30_000)
    try { await contents.loadURL(url) }
    finally { clearTimeout(timeout) }
  }
}
