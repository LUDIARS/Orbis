import { describe, expect, it } from 'vitest'
import { AiOriginPolicy } from '../src/main/vinculum/ai-origin-policy.js'
import { readAiModeConfig } from '../src/main/radix/ai-mode-config.js'

describe('AI-only origin boundary', () => {
  const policy = new AiOriginPolicy(['https://cc.ai-run-do.com', 'http://127.0.0.1:12345'])
  it.each(['https://cc.ai-run-do.com/', 'https://cc.ai-run-do.com/test?q=1',
    'wss://cc.ai-run-do.com/events', 'http://127.0.0.1:12345/test'])('allows a declared service: %s', (url) => {
    expect(policy.allows(url)).toBe(true)
  })
  it.each(['https://cc.ai-run-do.com.evil.test', 'https://cc.ai-run-do.com@evil.test',
    'https://evil.test@cc.ai-run-do.com', 'https://cc.ai-run-do.com:444',
    'http://cc.ai-run-do.com', 'http://127.0.0.1:12346', 'http://localhost:12345',
    'https://cc.ai-run-do.com.', 'file:///etc/passwd', 'javascript:alert(1)',
    'data:text/html,hello', 'blob:https://cc.ai-run-do.com/test', 'about:blank', 'garbage'])('rejects a bypass: %s', (url) => {
    expect(policy.allows(url)).toBe(false)
  })
  it.each([[], ['https://*.ai-run-do.com'], ['http://example.com'],
    ['https://cc.ai-run-do.com/path'], ['https://user@cc.ai-run-do.com'],
    ['https://cc.ai-run-do.com/?allow=all'], ['https://cc.ai-run-do.com.'], [42]].map((origins) => [origins]))('rejects invalid deployment policy: %j', (origins) => {
    expect(() => new AiOriginPolicy(origins)).toThrow()
  })
  it('never treats WebSocket URLs as page navigation', () => {
    expect(() => policy.requireNavigation('wss://cc.ai-run-do.com')).toThrow()
  })
})

describe('AI-only startup prerequisites', () => {
  const env = {
    ORBIS_MODE: 'ai-only', ORBIS_AI_CC_TOKEN: 'a'.repeat(43),
    ORBIS_AI_ALLOWED_ORIGINS: '["https://cc.ai-run-do.com"]',
    ORBIS_EXCUBITOR_URL: 'http://127.0.0.1:12345'
  }
  it('selects a separate profile and does not accept the human token environment', () => {
    expect(readAiModeConfig(env, '/profiles')?.profile.replaceAll('\\', '/')).toBe('/profiles/orbis-ai-only')
    expect(() => readAiModeConfig({ ...env, ORBIS_AI_CC_TOKEN: undefined, ORBIS_VINCULUM_TOKEN: 'a'.repeat(43) }, '/profiles')).toThrow()
  })
  it.each(['ORBIS_AI_CC_TOKEN', 'ORBIS_AI_ALLOWED_ORIGINS', 'ORBIS_EXCUBITOR_URL'])('fails closed when %s is missing', (key) => {
    expect(() => readAiModeConfig({ ...env, [key]: undefined }, '/profiles')).toThrow()
  })
  it('leaves human mode explicit and rejects mistyped modes', () => {
    expect(readAiModeConfig({}, '/profiles')).toBeUndefined()
    expect(readAiModeConfig({ ORBIS_MODE: 'human' }, '/profiles')).toBeUndefined()
    expect(() => readAiModeConfig({ ORBIS_MODE: 'ai' }, '/profiles')).toThrow()
  })
})
