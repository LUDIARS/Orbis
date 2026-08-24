import type { WebContents } from 'electron'
import type { CuraWindowFactory } from '../cura/window-factory.js'
import type { SigillumService } from '../sigillum/service.js'
import type { PageRepository } from '../tabularium/repositories/page-repo.js'
import { captureScreenshotPng, performAct, readOuterHtml } from './cdp.js'
import type { VinculumOperations } from './operations.js'

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
    if (mode === 'a11y') return { mode, status: 'not_supported', phase: 'P6' }
    const webContents = this.factory.pageWebContents(pageId)
    if (!webContents || webContents.isDestroyed()) throw new Error('The page is not open.')
    if (mode === 'dom') return { mode, url: summary.url, html: await readOuterHtml(webContents) }
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

  private pageIdOf(sigillum: string): string {
    const record = this.seals.get(sigillum)
    if (!record?.active) throw new Error('Unknown or inactive sigillum.')
    if (record.kind !== 'page' || !record.pageId) throw new Error('This tool requires a page sigillum. Use orbis.open to obtain one.')
    return record.pageId
  }
}
