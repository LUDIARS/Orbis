export default {
  post: (result: string, env: NodeJS.ProcessEnv = process.env): true | string =>
    (/^[A-Za-z0-9_-]{43}$/.test(result) && result === env.ORBIS_VINCULUM_TOKEN) || 'Token must come from the validated environment.'
}
