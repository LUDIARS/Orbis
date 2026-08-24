import { spawnSync } from 'node:child_process'

const result = spawnSync(process.execPath, ['--experimental-strip-types', 'src/main/migratio/cli.ts', ...process.argv.slice(2)], { stdio: 'inherit' })
process.exitCode = result.status ?? 1
