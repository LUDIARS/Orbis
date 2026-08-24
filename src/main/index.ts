import { app } from 'electron'
import { bootstrap } from './radix/bootstrap.js'

void bootstrap().catch((error: unknown) => {
  console.error('Orbis failed to start.', error)
  app.quit()
})
