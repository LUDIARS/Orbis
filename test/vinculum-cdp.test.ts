import type { WebContents } from 'electron'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { captureScreenshotPng, performAct, readAccessibilityTree } from '../src/main/vinculum/cdp.js'

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
  const element = (tagName: string, type: string, autocomplete: string) => ({
    tagName, value: 'unchanged', shadowRoot: null,
    getAttribute: (name: string) => name === 'type' ? type : name === 'autocomplete' ? autocomplete : null,
    dispatchEvent: () => true
  })
  const sensitive = [
    ['INPUT', 'password', ''], ['INPUT', 'PASSWORD', ''],
    ...['current-password', 'new-password', 'one-time-code', 'cc-number', 'cc-csc', 'section-checkout billing CC-EXP'].map(value => ['INPUT', 'text', value]),
    ['SELECT', '', 'cc-exp-month']
  ]

  it.each(sensitive)('blocks type and select for sensitive element %#', async (tag, type, autocomplete) => {
    const el = element(tag, type, autocomplete)
    const fake = fakeWebContents(async call => ({ result: { value: runInNewContext(String(call.params?.expression), {
      document: { activeElement: el, querySelector: () => el }, Event: class {}
    }) } }))
    for (const action of [{ type: 'type', text: 'private-dummy' }, { type: 'select', selector: '#field', value: 'private-dummy' }]) {
      await expect(performAct(fake.webContents, action)).rejects.toThrow('Input is unavailable or sensitive.')
    }
    expect(fake.calls.some(call => call.method === 'Input.insertText')).toBe(false)
    expect(el.value).toBe('unchanged')
    expect(fake.detached()).toBe(true)
  })

  it('allows ordinary typing and selection with bounded summaries', async () => {
    const el = element('INPUT', 'text', 'username')
    const fake = fakeWebContents(async call => call.method === 'Runtime.evaluate' ? { result: { value: runInNewContext(String(call.params?.expression), {
      document: { activeElement: el, querySelector: () => el }, Event: class {}
    }) } } : {})
    expect(await performAct(fake.webContents, { type: 'type', text: 'hello' })).toEqual({ performed: 'type(5 chars)' })
    expect(fake.calls.at(-1)).toEqual({ method: 'Input.insertText', params: { text: 'hello' } })
    expect(await performAct(fake.webContents, { type: 'select', selector: '#field', value: 'choice' })).toEqual({ performed: 'select' })
    expect(el.value).toBe('choice')
  })

  it('checks focused shadow and frame descendants and rejects inaccessible frames', async () => {
    const password = element('INPUT', 'password', '')
    for (const activeElement of [
      { ...element('DIV', '', ''), shadowRoot: { activeElement: password } },
      { ...element('IFRAME', '', ''), contentDocument: { activeElement: password } },
      { ...element('IFRAME', '', ''), contentDocument: null }
    ]) {
      const fake = fakeWebContents(async call => ({ result: { value: runInNewContext(String(call.params?.expression), {
        document: { activeElement }
      }) } }))
      await expect(performAct(fake.webContents, { type: 'type', text: 'dummy' })).rejects.toThrow()
      expect(fake.calls.some(call => call.method === 'Input.insertText')).toBe(false)
    }
  })
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

  it('reads a bounded accessibility tree through CDP', async () => {
    const fake = fakeWebContents(() => Promise.resolve({ nodes: [{ nodeId: '1' }, { nodeId: '2' }] }))
    expect(await readAccessibilityTree(fake.webContents, 1)).toEqual([{ nodeId: '1' }])
    expect(fake.calls[0].method).toBe('Accessibility.getFullAXTree')
  })
})
