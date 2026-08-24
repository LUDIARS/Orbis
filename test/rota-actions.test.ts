import { describe, expect, it, vi } from 'vitest'
import { selectRotaPage } from '../src/main/rota/actions.js'

const cura = {
  id: 'cura',
  title: 'Research',
  color: '#123456',
  habitusId: null,
  alwaysOnTop: false,
  opacity: 1,
  createdAt: '2026-08-24T09:00:00.000Z',
  lastActiveAt: '2026-08-24T10:00:00.000Z'
}
const page = {
  id: 'page',
  curaId: cura.id,
  url: 'https://example.com',
  title: 'Example',
  firstVisit: '2026-08-24T09:00:00.000Z',
  lastVisit: '2026-08-24T10:00:00.000Z',
  active: true
}

describe('Rota actions', () => {
  it('selects a dormant Cura page after its restored views are ready', () => {
    let didFinishLoad: (() => void) | undefined
    const window = {
      isDestroyed: () => false,
      isMinimized: () => false,
      restore: vi.fn(),
      show: vi.fn(),
      focus: vi.fn(),
      webContents: { once: (_event: string, listener: () => void) => { didFinishLoad = listener } }
    }
    const factory = {
      windowForCura: () => undefined,
      create: vi.fn(() => window),
      selectPage: vi.fn()
    }

    expect(selectRotaPage(
      cura.id,
      page.id,
      { list: () => [cura] },
      { listByCura: () => [page] },
      factory as never
    )).toBe(window)
    expect(factory.selectPage).not.toHaveBeenCalled()

    didFinishLoad?.()
    expect(factory.selectPage).toHaveBeenCalledWith(window, page.id)
  })

  it('rejects a page that does not belong to the requested Cura', () => {
    const factory = { windowForCura: vi.fn(), create: vi.fn(), selectPage: vi.fn() }
    expect(selectRotaPage(
      cura.id,
      'different-page',
      { list: () => [cura] },
      { listByCura: () => [page] },
      factory as never
    )).toBeUndefined()
    expect(factory.create).not.toHaveBeenCalled()
  })
})
