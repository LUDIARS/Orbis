import type { WebContents } from 'electron'
import { cssForFilters, validateFilters, type FilterStep } from './css.js'
import { presetById, vitrumPresets } from './presets/index.js'
import type { VitrumOwnerKind, VitrumRepository } from '../tabularium/repositories/vitrum-repo.js'

export interface VitrumSpec { id: string; filters: FilterStep[] }
export interface VitrumViewState { spec: VitrumSpec; presets: readonly string[] }
interface AppliedView { key: string | null; request: number; disposed: boolean }

const maxJsonBytes = 16 * 1024
const encoder = new TextEncoder()

/** @implements SPEC-ORBIS-VITRUM-SPEC SPEC-ORBIS-VITRUM-APPLY SPEC-ORBIS-VITRUM-PERSIST */
export class VitrumService {
  private readonly views = new Map<number, AppliedView>()
  constructor(private readonly repository: VitrumRepository) {}

  parseSpec(value: unknown): VitrumSpec {
    if (typeof value !== 'object' || value === null || Object.keys(value).length !== 2) throw new TypeError('Vitrum spec has unknown fields.')
    const { id, filters } = value as { id?: unknown; filters?: unknown }
    if (typeof id !== 'string' || id.length < 1 || id.length > 64) throw new TypeError('Vitrum id must be 1 to 64 characters.')
    const preset = presetById(id)
    const parsedFilters = validateFilters(filters)
    const spec = preset && parsedFilters.length === 0
      ? { id: preset.id, filters: preset.filters }
      : { id, filters: parsedFilters }
    if (encoder.encode(JSON.stringify(spec)).byteLength > maxJsonBytes) throw new RangeError('Vitrum spec exceeds 16 KiB.')
    return spec
  }
  stateFor(pageId: string, habitusId: string): VitrumViewState {
    return { spec: this.resolve(pageId, habitusId), presets: vitrumPresets.map((preset) => preset.id) }
  }
  savePage(pageId: string, value: unknown): VitrumSpec {
    const spec = this.parseSpec(value)
    this.repository.save('page', pageId, JSON.stringify(spec))
    return spec
  }
  saveHabitus(habitusId: string, value: unknown): VitrumSpec {
    const spec = this.parseSpec(value)
    this.repository.save('habitus', habitusId, JSON.stringify(spec))
    return spec
  }
  cycle(pageId: string, habitusId: string): VitrumSpec {
    const current = this.resolve(pageId, habitusId)
    const index = vitrumPresets.findIndex((preset) => preset.id === current.id)
    const next = vitrumPresets[(index + 1) % vitrumPresets.length] ?? vitrumPresets[0]
    return this.savePage(pageId, next)
  }
  apply(webContents: WebContents, pageId: string, habitusId: string): void {
    const state = this.views.get(webContents.id) ?? { key: null, request: 0, disposed: false }
    this.views.set(webContents.id, state)
    const request = ++state.request
    const css = cssForFilters(this.resolve(pageId, habitusId).filters)
    void webContents.insertCSS(css).then(async (key) => {
      if (state.disposed || request !== state.request) { await webContents.removeInsertedCSS(key); return }
      const previous = state.key
      state.key = key
      if (previous) await webContents.removeInsertedCSS(previous)
    }).catch(() => undefined)
  }
  watch(webContents: WebContents, pageId: () => string, habitusId: () => string): () => void {
    const reapply = (): void => this.apply(webContents, pageId(), habitusId())
    webContents.on('did-finish-load', reapply)
    return () => { webContents.removeListener('did-finish-load', reapply); this.dispose(webContents) }
  }
  dispose(webContents: WebContents): void {
    const state = this.views.get(webContents.id)
    if (!state) return
    state.disposed = true
    this.views.delete(webContents.id)
    if (state.key && !webContents.isDestroyed()) void webContents.removeInsertedCSS(state.key).catch(() => undefined)
  }
  private resolve(pageId: string, habitusId: string): VitrumSpec {
    return this.read('page', pageId) ?? this.read('habitus', habitusId) ?? presetById('none')!
  }
  private read(ownerKind: VitrumOwnerKind, ownerId: string): VitrumSpec | null {
    const serialized = this.repository.get(ownerKind, ownerId)
    if (!serialized || encoder.encode(serialized).byteLength > maxJsonBytes) return null
    try { return this.parseSpec(JSON.parse(serialized)) } catch { return null }
  }
}
