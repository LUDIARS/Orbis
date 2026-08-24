import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  main: {},
  preload: { build: { rollupOptions: { input: { index: resolve(__dirname, 'src/preload/index.ts'), 'page-bridge': resolve(__dirname, 'src/preload/page-bridge.ts') } } } },
  renderer: {
    plugins: [react({})],
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'src/renderer/index.html'),
          rota: resolve(__dirname, 'src/renderer/rota.html')
        }
      }
    }
  }
})
