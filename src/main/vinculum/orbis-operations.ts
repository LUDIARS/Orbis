import type { WebContents } from 'electron'
import type { CuraWindowFactory } from '../cura/window-factory.js'
import { isAllowedExplorationUrl } from '../cura/navigation-url.js'
import { googleForma } from '../forma/sites/google/index.js'
import { googleResultLinks } from '../forma/sites/google/result-links.js'
import { googleSearchResultSelector } from '../forma/sites/google/selectors.js'
import type { SigillumService } from '../sigillum/service.js'
import type { PageRepository } from '../tabularium/repositories/page-repo.js'
import { captureScreenshotPng, performAct, readAccessibilityTree, readOuterHtml } from './cdp.js'
import type { VinculumOperations } from './operations.js'

const MAX_EXPLORATION_SECONDS = 30
const MAX_EXPLORATION_PAGES = 8
const MAX_EXCERPT_LENGTH = 2000
const PAGE_LOAD_TIMEOUT_MS = 5000
const RESULT_SETTLE_TIMEOUT_MS = 8000
const RESULT_SETTLE_POLL_MS = 400

/** @implements SPEC-ORBIS-P6-EXPLORATIO Apply the configured hard ceiling to caller-provided traversal limits. */
function bounded(value: number | undefined, fallback: number, upper: number): number {
  return Math.max(1, Math.min(Number.isFinite(value) ? Math.floor(value as number) : fallback, upper))
}

/** @implements SPEC-ORBIS-P6-EXPLORATIO Build the only search-engine URL supported by the registered Forma. */
function searchUrl(query: string, engine?: 'google'): string {
  if (engine && engine !== 'google') throw new Error('Unsupported search engine.')
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}

/** @implements SPEC-ORBIS-P6-EXPLORATIO Read Google results and validate the renderer boundary in Forma. */
async function resultLinks(webContents: WebContents, deadline: number): Promise<{ url: string; title: string }[]> {
  const script = `Array.from(document.querySelectorAll(${JSON.stringify(googleSearchResultSelector)})).map(a => ({ url: a.getAttribute('href') || '', title: (a.querySelector('h3')?.textContent || '').trim() })).filter(x => x.url && x.title)`
  const extraction = webContents.executeJavaScript(script, true).then((value: unknown) => googleResultLinks(value))
  let timer: NodeJS.Timeout | undefined
  const expiry = new Promise<{ url: string; title: string }[]>((resolve) => {
    timer = setTimeout(() => resolve([]), Math.max(0, deadline - Date.now()))
  })
  try {
    return await Promise.race([extraction, expiry])
  } finally {
    if (timer) clearTimeout(timer)
    // The renderer request cannot be cancelled; keep a later rejection handled.
    extraction.catch(() => undefined)
  }
}

/**
 * @implements SPEC-ORBIS-P6-EXPLORATIO
 * 検索結果は did-finish-load の後から描画されることがあるため、 リンクが 1 件も
 * 無い間だけ短い間隔で見直す。 本当に 0 件のクエリでは上限で諦める。
 */
async function settledResultLinks(webContents: WebContents, explorationDeadline: number): Promise<{ url: string; title: string }[]> {
  const deadline = Math.min(Date.now() + RESULT_SETTLE_TIMEOUT_MS, explorationDeadline)
  for (;;) {
    if (Date.now() >= deadline) return []
    const links = await resultLinks(webContents, deadline)
    if (links.length > 0 || Date.now() >= deadline) return links
    await new Promise<void>((resolve) => setTimeout(resolve, Math.min(RESULT_SETTLE_POLL_MS, Math.max(0, deadline - Date.now()))))
  }
}

/** @implements SPEC-ORBIS-P6-EXPLORATIO Bound page loading and remove the listener on every completion path. */
async function waitForPageLoad(webContents: WebContents, explorationDeadline: number): Promise<void> {
  if (!webContents.isLoading() || Date.now() >= explorationDeadline) return
  await new Promise<void>((resolve) => {
    let timer: NodeJS.Timeout | undefined
    const finish = (): void => {
      if (timer) clearTimeout(timer)
      webContents.removeListener('did-finish-load', finish)
      webContents.removeListener('did-fail-load', finish)
      webContents.removeListener('destroyed', finish)
      resolve()
    }
    webContents.once('did-finish-load', finish)
    webContents.once('did-fail-load', finish)
    webContents.once('destroyed', finish)
    timer = setTimeout(finish, Math.min(PAGE_LOAD_TIMEOUT_MS, Math.max(0, explorationDeadline - Date.now())))
    // The load may have completed between the check above and listener setup.
    if (!webContents.isLoading()) finish()
  })
}

/** CDP (renderer 側) を先に試し、駄目なら compositor 経由の capturePage に落とす。 */
async function capturePng(webContents: WebContents): Promise<string> {
  try {
    const data = await captureScreenshotPng(webContents)
    if (data) return data
  } catch (error) {
    console.warn('Unable to capture the page over CDP.', error)
  }
  try {
    return (await webContents.capturePage()).toPNG().toString('base64')
  } catch (error) {
    console.warn('Unable to capture the page.', error)
    return ''
  }
}

/** @implements SPEC-ORBIS-P5-VINCULUM sigillum を Cura/page に解決し、人間と同じ経路で実行する。 */
export class OrbisVinculumOperations implements VinculumOperations {
  constructor(
    private readonly seals: SigillumService,
    private readonly factory: CuraWindowFactory,
    private readonly pageRepository: PageRepository
  ) {}

  async navigate(sigillum: string, url: string): Promise<unknown> {
    const pageId = this.pageIdOf(sigillum)
    await this.factory.navigateLlmPage(pageId, url)
    return { navigated: url, pageId }
  }

  async open(sigillum: string, url: string, visible: boolean): Promise<{ pageId: string; pageSigillum: string; umbra: boolean }> {
    const record = this.seals.get(sigillum)
    if (!record?.active) throw new Error('Unknown or inactive sigillum.')
    const { pageId } = this.factory.openLlmPage(record.curaId, url, visible)
    return { pageId, pageSigillum: this.seals.forPage(record.curaId, pageId), umbra: !visible }
  }

  async read(sigillum: string, mode: 'text' | 'dom' | 'a11y' | 'screenshot'): Promise<unknown> {
    const pageId = this.pageIdOf(sigillum)
    const summary = this.factory.pageSummary(pageId)
    if (!summary) throw new Error('The page is not open.')
    if (mode === 'text') return { mode, url: summary.url, title: summary.title, text: this.pageRepository.contentFor(summary.pageId) }
    const webContents = this.factory.pageWebContents(pageId)
    if (!webContents || webContents.isDestroyed()) throw new Error('The page is not open.')
    if (mode === 'dom') return { mode, url: summary.url, html: await readOuterHtml(webContents) }
    if (mode === 'a11y') return { mode, url: summary.url, nodes: await readAccessibilityTree(webContents), truncatedAt: 500 }
    // Umbra (未 attach) の view は composite されないため capturePage が空になるか失敗する。offscreen 描画での取得は P6。
    const base64 = await capturePng(webContents)
    if (!base64) {
      if (summary.umbra) return { mode, url: summary.url, mimeType: 'image/png', base64: '', note: 'The page is umbra (not rendered). Reveal it to capture a screenshot.' }
      throw new Error('The page could not be captured.')
    }
    return { mode, url: summary.url, mimeType: 'image/png', base64 }
  }

  async act(sigillum: string, action: Record<string, unknown>): Promise<unknown> {
    const pageId = this.pageIdOf(sigillum)
    const webContents = this.factory.pageWebContents(pageId)
    if (!webContents || webContents.isDestroyed()) throw new Error('The page is not open.')
    return performAct(webContents, action)
  }

  async search(request: { sigillum: string; query: string; engine?: 'google'; depth?: number; maxPages?: number }): Promise<unknown> {
    const source = this.seals.get(request.sigillum)
    if (!source?.active) throw new Error('Unknown or inactive sigillum.')
    if (!request.query.trim()) throw new Error('query is required.')
    const maxPages = bounded(request.maxPages, MAX_EXPLORATION_PAGES, MAX_EXPLORATION_PAGES)
    const depth = bounded(request.depth, 1, 1)
    const started = Date.now()
    const deadline = started + MAX_EXPLORATION_SECONDS * 1000
    const search = this.factory.openExplorationPage(source.curaId, searchUrl(request.query, request.engine), source.pageId ?? null)
    const searchSeal = this.seals.forPage(source.curaId, search.pageId)
    const searchContents = this.factory.pageWebContents(search.pageId)
    if (!searchContents) throw new Error('The search page is not open.')
    await waitForPageLoad(searchContents, deadline)
    const links = await settledResultLinks(searchContents, deadline)
    const results: { url: string; title: string; text: string; sigillum: string }[] = []
    for (const link of links) {
      if (results.length >= maxPages || Date.now() >= deadline) break
      let parsed: URL
      try { parsed = new URL(link.url) } catch { continue }
      if (!/^https?:$/.test(parsed.protocol) || googleForma.match(parsed) || !isAllowedExplorationUrl(parsed.toString())) continue
      let page: { pageId: string }
      try {
        page = this.factory.openExplorationPage(source.curaId, parsed.toString(), search.pageId)
      } catch (error) {
        if (error instanceof Error && error.message === 'The exploration URL is not allowed.') continue
        throw error
      }
      const contents = this.factory.pageWebContents(page.pageId)
      if (!contents || contents.isDestroyed()) continue
      await waitForPageLoad(contents, deadline)
      if (Date.now() >= deadline || contents.isDestroyed()) break
      const summary = this.factory.pageSummary(page.pageId)
      if (!summary) continue
      const title = summary.title && summary.title !== summary.url ? summary.title : link.title
      results.push({ url: summary.url, title, text: this.pageRepository.contentFor(summary.pageId), sigillum: this.seals.forPage(source.curaId, page.pageId) })
    }
    return { query: request.query, engine: request.engine ?? 'google', depth, maxPages, maxSeconds: MAX_EXPLORATION_SECONDS, searchSigillum: searchSeal, results, stopped: Date.now() >= deadline }
  }

  async toMemoria(sigillum: string, kind: 'note' | 'task', selection?: string, summary?: string): Promise<unknown> {
    const pageId = this.pageIdOf(sigillum)
    const page = this.factory.pageSummary(pageId)
    if (!page) throw new Error('The page is not open.')
    const excerpt = (selection?.trim() || summary?.trim() || this.pageRepository.contentFor(page.pageId)).slice(0, MAX_EXCERPT_LENGTH)
    return { kind, excerpt: { url: page.url, title: page.title, text: excerpt }, delivery: 'cc_memoria_delegate' }
  }

  async reveal(sigillum: string, userUtteranceId: string): Promise<unknown> {
    if (!userUtteranceId.trim()) throw new Error('userUtteranceId is required.')
    const pageId = this.pageIdOf(sigillum)
    this.factory.revealLlmPage(pageId)
    return { revealed: true, pageId, userUtteranceId }
  }

  private pageIdOf(sigillum: string): string {
    const record = this.seals.get(sigillum)
    if (!record?.active) throw new Error('Unknown or inactive sigillum.')
    if (record.kind !== 'page' || !record.pageId) throw new Error('This tool requires a page sigillum. Use orbis.open to obtain one.')
    return record.pageId
  }
}
