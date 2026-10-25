import { join } from 'node:path'
import { AiOriginPolicy } from '../vinculum/ai-origin-policy.js'
import { excubitorBaseUrl } from '../vinculum/excubitor.js'

export interface AiModeConfig {
  token: string
  origins: AiOriginPolicy
  excubitorUrl: string
  profile: string
}

/** @implements SPEC-ORBIS-AI-ONLY Validate before any profile or window is opened. */
export function readAiModeConfig(env: NodeJS.ProcessEnv, appData: string): AiModeConfig | undefined {
  if (env.ORBIS_MODE === undefined || env.ORBIS_MODE === 'human') return undefined
  if (env.ORBIS_MODE !== 'ai-only') throw new Error('Unknown ORBIS_MODE.')
  if (!/^[A-Za-z0-9_-]{43}$/.test(env.ORBIS_AI_CC_TOKEN ?? '')) {
    throw new Error('AI mode requires a dedicated ORBIS_AI_CC_TOKEN from the secret store.')
  }
  const excubitorUrl = excubitorBaseUrl(env)
  if (!excubitorUrl) throw new Error('AI mode requires the catalog-resolved Excubitor URL.')
  let origins: unknown
  try { origins = JSON.parse(env.ORBIS_AI_ALLOWED_ORIGINS ?? '') }
  catch { throw new Error('ORBIS_AI_ALLOWED_ORIGINS must be a JSON array of LUDIARS origins.') }
  return {
    token: env.ORBIS_AI_CC_TOKEN as string,
    origins: new AiOriginPolicy(origins),
    excubitorUrl,
    profile: join(appData, 'orbis-ai-only')
  }
}
