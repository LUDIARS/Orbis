import { EventEmitter } from 'node:events'
import { afterEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ create: vi.fn(), mkdir: vi.fn(), writeFile: vi.fn() }))
vi.mock('node:http', () => ({ createServer: state.create }))
vi.mock('node:fs/promises', () => ({ mkdir: state.mkdir, writeFile: state.writeFile }))
import { VinculumServer } from '../src/main/vinculum/server.js'
import { vinculumPort } from '../src/main/vinculum/port.js'

function server(): VinculumServer {
  return new VinculumServer('a'.repeat(43), ...Array(4).fill({}) as [never, never, never, never])
}

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })

describe('Vinculum startup configuration (mock HTTP listener)', () => {
  it.each([undefined, '', '0', '-1', '65536', '1.5', 'NaN', '1e3', ' 80 ', '80\n', '0x50'])('rejects invalid port %# before creating a listener', async raw => {
    vi.stubEnv('ORBIS_VINCULUM_PORT', raw)
    await expect(server().start('unused')).rejects.toThrow('ORBIS_VINCULUM_PORT')
    expect(state.create).not.toHaveBeenCalled()
  })

  it.each(['1', '17391', '65535'])('accepts configured TCP port %s', raw => {
    expect(vinculumPort({ ORBIS_VINCULUM_PORT: raw })).toBe(Number(raw))
  })

  it('binds the configured port on loopback and writes compatibility discovery', async () => {
    vi.stubEnv('ORBIS_VINCULUM_PORT', '17391')
    const listener = Object.assign(new EventEmitter(), {
      listening: true,
      listen: vi.fn((_port: number, _host: string, ready: () => void) => ready()),
      address: () => ({ port: 17391 }),
      close: vi.fn((done: () => void) => done())
    })
    state.create.mockReturnValue(listener)
    const instance = server()
    expect(await instance.start('unused')).toBe(17391)
    expect(listener.listen).toHaveBeenCalledWith(17391, '127.0.0.1', expect.any(Function))
    expect(state.writeFile).toHaveBeenCalledWith(expect.stringContaining('vinculum.json'), '{"port":17391}', 'utf8')
    await instance.stop()
    expect(listener.close).toHaveBeenCalledOnce()
  })

  it('propagates port conflicts without retrying on an OS assigned port', async () => {
    vi.stubEnv('ORBIS_VINCULUM_PORT', '17391')
    const listener = Object.assign(new EventEmitter(), {
      listening: false,
      listen: vi.fn(() => { listener.emit('error', new Error('EADDRINUSE')) })
    })
    state.create.mockReturnValue(listener)
    await expect(server().start('unused')).rejects.toThrow('EADDRINUSE')
    expect(listener.listen).toHaveBeenCalledOnce()
    expect(state.writeFile).not.toHaveBeenCalled()
  })

  it('starts both modes without requesting the human port for AI-only discovery', async () => {
    vi.stubEnv('ORBIS_VINCULUM_PORT', '17391')
    const listeners = [17391, 49152].map(port => Object.assign(new EventEmitter(), {
      listening: true,
      listen: vi.fn((_port: number, _host: string, ready: () => void) => ready()),
      address: () => ({ port }),
      close: vi.fn((done: () => void) => done()),
      closeAllConnections: vi.fn()
    }))
    state.create.mockReturnValueOnce(listeners[0]).mockReturnValueOnce(listeners[1])
    const human = server()
    const ai = new VinculumServer('b'.repeat(43), ...Array(4).fill({}) as [never, never, never, never],
      () => false, {}, { browserSigillum: 'ai-browser' })
    try {
      expect(await human.start('human-profile')).toBe(17391)
      expect(await ai.start('ai-profile')).toBe(49152)
      expect(listeners[0].listen).toHaveBeenCalledWith(17391, '127.0.0.1', expect.any(Function))
      expect(listeners[1].listen).toHaveBeenCalledWith(0, '127.0.0.1', expect.any(Function))
      expect(state.writeFile).toHaveBeenCalledWith(expect.stringContaining('ai-profile'),
        '{"port":49152,"mode":"ai-only","browserSigillum":"ai-browser"}', 'utf8')
    } finally { await human.stop(); await ai.stop() }
  })

  it.each([undefined, 'invalid'])('does not read human port configuration in AI-only mode: %s', async raw => {
    vi.stubEnv('ORBIS_VINCULUM_PORT', raw)
    const listener = Object.assign(new EventEmitter(), {
      listening: true,
      listen: vi.fn((_port: number, _host: string, ready: () => void) => ready()),
      address: () => ({ port: 49152 }),
      close: vi.fn((done: () => void) => done()),
      closeAllConnections: vi.fn()
    })
    state.create.mockReturnValue(listener)
    const ai = new VinculumServer('b'.repeat(43), ...Array(4).fill({}) as [never, never, never, never],
      () => false, {}, { browserSigillum: 'ai-browser' })
    try {
      expect(await ai.start('ai-profile')).toBe(49152)
      expect(listener.listen).toHaveBeenCalledWith(0, '127.0.0.1', expect.any(Function))
    } finally { await ai.stop() }
  })
})
