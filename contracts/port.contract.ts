export default {
  post: (result: number, env: NodeJS.ProcessEnv = process.env): true | string =>
    (Number.isInteger(result) && result >= 1 && result <= 65535 && result === Number(env.ORBIS_VINCULUM_PORT)) || 'Port must be a configured TCP port.'
}
