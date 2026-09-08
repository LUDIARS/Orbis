// @spec SPEC-ORBIS-TELA-CEF
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// @implements SPEC-ORBIS-TELA-CEF
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const options = new Map()
for (let index = 2; index < process.argv.length; index += 2) {
  const name = process.argv[index]
  const value = process.argv[index + 1]
  if (!['--cef-root', '--tela-prefix', '--pictor-lib'].includes(name) || !value || options.has(name)) {
    throw new Error('Expected --cef-root PATH --tela-prefix PATH --pictor-lib FILE')
  }
  options.set(name, resolve(value))
}
for (const name of ['--cef-root', '--tela-prefix', '--pictor-lib']) {
  if (!options.has(name) || !existsSync(options.get(name))) throw new Error(`Missing ${name}`)
}
if (process.platform !== 'win32') throw new Error('The native host currently requires Windows x64')
// Windows variables are case-insensitive; duplicate Path/PATH breaks MSBuild.
const env = Object.fromEntries(Object.entries(process.env).map(([name, value]) => [name.toUpperCase(), value]))
function run(args) {
  const child = spawnSync('cmake', args, { cwd: root, env, stdio: 'inherit', shell: false, windowsHide: true })
  if (child.error) throw child.error
  if (child.status !== 0) throw new Error(`CMake failed with exit ${child.status}`)
}
run(['-S', 'native', '-B', 'build-native', '-G', 'Visual Studio 17 2022', '-A', 'x64',
  `-DCEF_ROOT=${options.get('--cef-root')}`, `-DCMAKE_PREFIX_PATH=${options.get('--tela-prefix')}`,
  `-DTELA_PICTOR_LIBRARY=${options.get('--pictor-lib')}`])
run(['--build', 'build-native', '--config', 'Release', '--parallel', '4'])
