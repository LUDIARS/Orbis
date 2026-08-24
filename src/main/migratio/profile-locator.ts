import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { homedir, platform } from 'node:os'
import { isAbsolute, join, relative, resolve } from 'node:path'

export type ChromiumBrowser = 'chrome' | 'vivaldi'

/** @implements SPEC-ORBIS-MIGRATIO-PROFILE */
const browserDirectory = (browser: ChromiumBrowser): string => {
  if (platform() === 'win32') {
    const local = process.env.LOCALAPPDATA
    if (!local) throw new Error('LOCALAPPDATA is not set')
    return browser === 'chrome' ? join(local, 'Google', 'Chrome', 'User Data') : join(local, 'Vivaldi', 'User Data')
  }
  if (platform() === 'darwin') {
    return browser === 'chrome'
      ? join(homedir(), 'Library', 'Application Support', 'Google', 'Chrome')
      : join(homedir(), 'Library', 'Application Support', 'Vivaldi')
  }
  return browser === 'chrome' ? join(homedir(), '.config', 'google-chrome') : join(homedir(), '.config', 'vivaldi')
}

/** @implements SPEC-ORBIS-MIGRATIO-PROFILE */
export function getBrowserUserDataDirectory(browser: ChromiumBrowser): string {
  return browserDirectory(browser)
}

/** @implements SPEC-ORBIS-MIGRATIO-PROFILE */
export function listProfiles(browser: ChromiumBrowser): string[] {
  const root = browserDirectory(browser)
  if (!existsSync(root)) return []
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && (entry.name === 'Default' || entry.name.startsWith('Profile ')))
    .map((entry) => entry.name)
    .sort()
}

/** @implements SPEC-ORBIS-MIGRATIO-PROFILE */
export function resolveProfileDirectory(browser: ChromiumBrowser, profile?: string): string {
  if (profile) return profile
  const root = browserDirectory(browser)
  const localState = join(root, 'Local State')
  if (existsSync(localState)) {
    try {
      const state = JSON.parse(readFileSync(localState, 'utf8')) as { profile?: { last_used?: string } }
      if (state.profile?.last_used) {
        const candidate = resolve(root, state.profile.last_used)
        const relativeCandidate = relative(root, candidate)
        if (relativeCandidate && !relativeCandidate.startsWith('..') && !isAbsolute(relativeCandidate)) return candidate
      }
    } catch {
      // A damaged Local State file falls back to Chromium's default profile.
    }
  }
  return join(root, 'Default')
}
