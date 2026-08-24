export interface VinculumOperations {
  navigate(sigillum: string, url: string): Promise<unknown>
  open(sigillum: string, url: string, visible: boolean): Promise<unknown>
  read(sigillum: string, mode: 'text' | 'dom' | 'a11y' | 'screenshot'): Promise<unknown>
  act(sigillum: string, action: Record<string, unknown>): Promise<unknown>
}
