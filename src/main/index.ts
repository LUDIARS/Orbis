import { app } from 'electron'
import { readAiModeConfig } from './radix/ai-mode-config.js'
import { bootstrapAiMode } from './radix/ai-bootstrap.js'

async function start(): Promise<void> {
  const ai = readAiModeConfig(process.env, app.getPath('appData'))
  // Renderer subprocesses must not inherit the control credential.
  delete process.env.ORBIS_AI_CC_TOKEN
  if (ai) await bootstrapAiMode(ai)
  else await (await import('./radix/bootstrap.js')).bootstrap()
}

void start().catch(() => {
  // Startup configuration may carry credentials. Do not serialize exception details.
  console.error('Orbis startup failed. Check mode and required deployment configuration.')
  app.exit(1)
})
