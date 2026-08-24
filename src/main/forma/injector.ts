import type { WebContents } from 'electron'
import type { HabitusId } from '../habitus/types.js'
import type { FormaRegistry } from './registry.js'

const insertedCssKeys = new WeakMap<WebContents, string[]>()

/** @implements SPEC-ORBIS-P2-FORMA */
async function clearInjectedCss(webContents: WebContents): Promise<void> {
  const keys = insertedCssKeys.get(webContents) ?? []
  insertedCssKeys.delete(webContents)
  // Navigation can invalidate CSS keys; cleanup is best-effort before applying the current Forma.
  await Promise.allSettled(keys.map((key) => webContents.removeInsertedCSS(key)))
}

/** @implements SPEC-ORBIS-P2-FORMA */
export async function injectForma(webContents: WebContents, registry: FormaRegistry, habitus: HabitusId): Promise<void> {
  await clearInjectedCss(webContents)
  const cssKeys: string[] = []
  insertedCssKeys.set(webContents, cssKeys)
  try {
    for (const forma of registry.matching(webContents.getURL(), habitus)) {
      if (forma.css) cssKeys.push(await webContents.insertCSS(forma.css))
      webContents.send('orbis:forma-apply', { id: forma.id })
    }
  } catch (error) {
    await Promise.allSettled(cssKeys.map((key) => webContents.removeInsertedCSS(key)))
    insertedCssKeys.delete(webContents)
    throw error
  }
}
