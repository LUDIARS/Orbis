import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { supportNonTtyBuildOutput } from './scripts/non-tty-build-output.js'

supportNonTtyBuildOutput(process.stdout)

export default defineConfig({
  main: {},
  preload: {
    build: {
      // Sandboxed preloads cannot require shared output chunks or Node dependencies.
      isolatedEntries: true,
      externalizeDeps: false,
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
          'page-bridge': resolve(__dirname, 'src/preload/page-bridge.ts')
        }
      }
    }
  },
  renderer: {
    plugins: [react({})],
    build: {
      rollupOptions: {
        input: {
          rota: resolve(__dirname, 'src/renderer/rota.html'),
          anulus: resolve(__dirname, 'src/renderer/anulus.html'),
          speculum: resolve(__dirname, 'src/renderer/speculum.html'),
          page: resolve(__dirname, 'src/renderer/page.html')
        }
      }
    }
  }
})
