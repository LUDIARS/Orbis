import { existsSync, readFileSync } from 'node:fs'
import { normalizeUrl } from './url-normalizer.ts'
import type { ImportedCura, ImportedEdge, ImportedPage } from './types.ts'

interface BookmarkNode {
  id?: string
  guid?: string
  type?: string
  name?: string
  url?: string
  children?: BookmarkNode[]
}

interface BookmarkDocument {
  roots?: Record<string, BookmarkNode>
}

const palette = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2']

const colorFor = (name: string): string => {
  let hash = 0
  for (const character of name) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  return palette[hash % palette.length]
}

const firstUrl = (node: BookmarkNode): string | null => {
  if (node.type === 'url' && node.url) return normalizeUrl(node.url)
  for (const child of node.children ?? []) {
    const found = firstUrl(child)
    if (found) return found
  }
  return null
}

const collectFolder = (node: BookmarkNode, pages: ImportedPage[], edges: ImportedEdge[]): string | null => {
  const representative = firstUrl(node)
  for (const child of node.children ?? []) {
    if (child.type === 'url' && child.url) {
      const url = normalizeUrl(child.url)
      if (url) pages.push({ url, title: child.name ?? '', pinned: true })
      continue
    }
    if (child.type === 'folder') {
      const childRepresentative = collectFolder(child, pages, edges)
      if (representative && childRepresentative && representative !== childRepresentative) {
        edges.push({ fromUrl: representative, toUrl: childRepresentative, kind: 'manual', count: 1, lastAt: new Date(0).toISOString() })
      }
    }
  }
  return representative
}

const makeCura = (browser: string, node: BookmarkNode, fallbackTitle: string, identity: string): ImportedCura => {
  const title = node.name || fallbackTitle
  const pages: ImportedPage[] = []
  const edges: ImportedEdge[] = []
  collectFolder(node, pages, edges)
  return { key: `bookmarks:${browser}:${identity}`, title, color: colorFor(title), pages, edges }
}

/** @implements SPEC-ORBIS-MIGRATIO-BOOKMARKS */
export function parseChromiumBookmarks(document: BookmarkDocument, browser: string): ImportedCura[] {
  const curas: ImportedCura[] = []
  const loose: BookmarkNode = { type: 'folder', name: `Imported: ${browser} bookmarks`, children: [] }
  for (const rootName of ['bookmark_bar', 'other', 'synced']) {
    const root = document.roots?.[rootName]
    if (!root) continue
    for (const [index, child] of (root.children ?? []).entries()) {
      if (child.type === 'folder') {
        const identity = child.guid ?? child.id ?? `${rootName}:${index}`
        curas.push(makeCura(browser, child, `Imported: ${browser} bookmarks`, identity))
      } else {
        loose.children?.push(child)
      }
    }
  }
  if ((loose.children?.length ?? 0) > 0) {
    curas.push(makeCura(browser, loose, loose.name ?? 'Imported bookmarks', 'loose'))
  }
  return curas.filter((cura) => cura.pages.length > 0)
}

/** @implements SPEC-ORBIS-MIGRATIO-BOOKMARKS */
export function readChromiumBookmarks(file: string, browser: string): ImportedCura[] {
  if (!existsSync(file)) return []
  return parseChromiumBookmarks(JSON.parse(readFileSync(file, 'utf8')) as BookmarkDocument, browser)
}
