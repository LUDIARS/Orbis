import type { BrowserWindow } from 'electron'
import { cycleOpacity, toggleAlwaysOnTop, type FenestraState } from './state-machine.js'

export function applyAlwaysOnTop(window: BrowserWindow, state: FenestraState): FenestraState { const next = toggleAlwaysOnTop(state); window.setAlwaysOnTop(next.alwaysOnTop, 'floating'); return next }
export function applyOpacity(window: BrowserWindow, state: FenestraState): FenestraState { if (process.platform === 'linux') { console.warn('Opacity is unavailable on Linux.'); return state }; const next = cycleOpacity(state); window.setOpacity(next.opacity); return next }
export function minimizeNonPinned(windows: Iterable<BrowserWindow>): void { for (const window of windows) if (!window.isAlwaysOnTop()) window.minimize() }
