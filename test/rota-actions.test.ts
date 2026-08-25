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
  active: true,
  umbra: false
}

describe('Rota actions', () => {
  it('restores and selects a dormant Cura page', () => {
    const window = {
      isDestroyed: () => false,
      isMinimized: () => false,
      restore: vi.fn(),
      show: vi.fn(),
      focus: vi.fn()
    }
    const factory = {
      create: vi.fn(),
      activateCura: vi.fn(),
      selectPageById: vi.fn(() => window)
    }

    expect(selectRotaPage(
      cura.id,
      page.id,
      { list: () => [cura] },
      { listByCura: () => [page] },
      factory as never
    )).toBe(window)
    expect(factory.create).toHaveBeenCalledWith(cura, [page])
    expect(factory.selectPageById).toHaveBeenCalledWith(page.id)
  })

  it('rejects a page that does not belong to the requested Cura', () => {
    const factory = { create: vi.fn(), activateCura: vi.fn(), selectPageById: vi.fn() }
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
