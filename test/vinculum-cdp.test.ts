import type { WebContents } from 'electron'
import { describe, expect, it } from 'vitest'
import { captureScreenshotPng, performAct } from '../src/main/vinculum/cdp.js'

interface Call { method: string; params?: Record<string, unknown> }

function fakeWebContents(respond: (call: Call) => Promise<unknown>): { webContents: WebContents; calls: Call[]; detached: () => boolean } {
  const calls: Call[] = []
  let attached = false
  let everDetached = false
  const debuggerApi = {
    isAttached: () => attached,
    attach: () => { attached = true },
    detach: () => { attached = false; everDetached = true },
    sendCommand: (method: string, params?: Record<string, unknown>) => {
      const call = { method, params }
      calls.push(call)
      return respond(call)
    }
  }
  return { webContents: { debugger: debuggerApi } as unknown as WebContents, calls, detached: () => everDetached }
}

describe('vinculum cdp', () => {
  it('scrolls with scrollBy instead of a wheel event that may never be acknowledged', async () => {
    const fake = fakeWebContents(() => Promise.resolve({ result: { value: undefined } }))
    expect(await performAct(fake.webContents, { type: 'scroll', deltaY: 240 })).toEqual({ performed: 'scroll(240)' })
    expect(fake.calls.map((call) => call.method)).toEqual(['Runtime.evaluate'])
    expect(fake.calls[0].params?.expression).toBe('window.scrollBy(0, 240)')
    expect(fake.detached()).toBe(true)
  })

  it('dispatches a press and a release for a click', async () => {
    const fake = fakeWebContents(() => Promise.resolve({}))
    expect(await performAct(fake.webContents, { type: 'click', x: 4, y: 6 })).toEqual({ performed: 'click(4, 6)' })
    expect(fake.calls.map((call) => call.params?.type)).toEqual(['mousePressed', 'mouseReleased'])
  })

  it('rejects an unsupported action and a selector that matches nothing', async () => {
    const fake = fakeWebContents(() => Promise.resolve({ result: { value: 'not_found' } }))
    await expect(performAct(fake.webContents, { type: 'jump' })).rejects.toThrow(/Unsupported action type/)
    await expect(performAct(fake.webContents, { type: 'select', selector: '#none', value: 'x' })).rejects.toThrow(/did not match/)
  })

  it('returns the captured image and detaches afterwards', async () => {
    const fake = fakeWebContents(() => Promise.resolve({ data: 'iVBOR' }))
    expect(await captureScreenshotPng(fake.webContents)).toBe('iVBOR')
    expect(fake.calls[0].params?.fromSurface).toBe(false)
    expect(fake.detached()).toBe(true)
  })

  it('gives up on a capture that never answers so an umbra page cannot hang the caller', async () => {
    const fake = fakeWebContents(() => new Promise(() => undefined))
    expect(await captureScreenshotPng(fake.webContents, 10)).toBe('')
    expect(fake.detached()).toBe(true)
  })
})
