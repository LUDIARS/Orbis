import type { OrbisBridge } from '../shared/ipc-contract.js'

declare module '*.module.css' {
  const classes: Record<string, string>
  export default classes
}

declare global {
  interface Window {
    orbis: OrbisBridge
  }
}

export {}
