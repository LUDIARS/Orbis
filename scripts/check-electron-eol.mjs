import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { devDependencies } = require('../package.json')

const majorOf = (label, value) => {
  const match = typeof value === 'string' && value.match(/^[~^]?(\d+)\.\d+\.\d+$/)
  if (!match) throw new TypeError(`${label} is not a valid stable Electron version.`)
  return Number(match[1])
}

const installedMajor = majorOf('Configured version', devDependencies.electron)
const response = await fetch('https://registry.npmjs.org/electron/latest', {
  signal: AbortSignal.timeout(15_000)
})
if (!response.ok) throw new Error(`Unable to read Electron latest metadata: ${response.status}`)
const metadata = await response.json()
const latestMajor = majorOf('Registry version', metadata?.version)
if (installedMajor < latestMajor - 2) {
  throw new Error(`Electron ${installedMajor} is outside the latest three majors (latest: ${latestMajor}).`)
}
