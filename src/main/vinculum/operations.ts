export interface VinculumOperations {
  navigate(sigillum: string, url: string): Promise<unknown>
  open(sigillum: string, url: string, visible: boolean): Promise<unknown>
  read(sigillum: string, mode: 'text' | 'dom' | 'a11y' | 'screenshot'): Promise<unknown>
  act(sigillum: string, action: Record<string, unknown>): Promise<unknown>
  search(request: { sigillum: string; query: string; engine?: 'google'; depth?: number; maxPages?: number }): Promise<unknown>
  toMemoria(sigillum: string, kind: 'note' | 'task', selection?: string, summary?: string): Promise<unknown>
  reveal(sigillum: string, userUtteranceId: string): Promise<unknown>
}
