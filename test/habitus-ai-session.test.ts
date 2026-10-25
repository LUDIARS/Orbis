import type { Session, OnHeadersReceivedListenerDetails, HeadersReceivedResponse } from 'electron'
import { expect, it, vi } from 'vitest'
import { restrictAiSession } from '../src/main/habitus/ai-session.js'
import { AiOriginPolicy } from '../src/main/vinculum/ai-origin-policy.js'

it('adds a non-removable no-modal sandbox while preserving the application CSP', async () => {
  const webRequest = { onBeforeRequest: vi.fn(), onHeadersReceived: vi.fn() }
  const target = {
    setProxy: vi.fn().mockResolvedValue(undefined), webRequest,
    setPermissionCheckHandler: vi.fn(), setPermissionRequestHandler: vi.fn(),
    setDevicePermissionHandler: vi.fn(), on: vi.fn(), removeListener: vi.fn()
  }
  const dispose = await restrictAiSession(target as unknown as Session,
    new AiOriginPolicy(['https://cc.ai-run-do.com']), 12345)
  const handler = webRequest.onHeadersReceived.mock.calls[0][0] as (
    details: Pick<OnHeadersReceivedListenerDetails, 'responseHeaders'>,
    callback: (response: HeadersReceivedResponse) => void
  ) => void
  const existing = { 'content-security-policy': ["default-src 'self'"], 'x-test': ['retained'] }
  const callback = vi.fn()
  handler({ responseHeaders: existing }, callback)
  expect(callback.mock.calls[0][0].responseHeaders).toEqual({
    'content-security-policy': ["default-src 'self'", 'sandbox allow-scripts allow-same-origin allow-forms'],
    'x-test': ['retained']
  })
  expect(existing['content-security-policy']).toEqual(["default-src 'self'"])
  expect(target.setProxy).toHaveBeenCalledWith({
    mode: 'fixed_servers', proxyRules: 'http://127.0.0.1:12345', proxyBypassRules: '<-loopback>'
  })
  dispose()
  expect(webRequest.onHeadersReceived).toHaveBeenLastCalledWith(null)
})
