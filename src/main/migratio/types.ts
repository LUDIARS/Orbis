/** Shared, browser-independent records consumed by the Tabularium importer. */
export interface ImportedPage {
  url: string
  title: string
  pinned: boolean
  visitedAt?: string
}

export interface ImportedEdge {
  fromUrl: string
  toUrl: string
  kind: 'manual' | 'navigate'
  count: number
  lastAt: string
}

export interface ImportedCura {
  key: string
  title: string
  color: string
  pages: ImportedPage[]
  edges: ImportedEdge[]
}
