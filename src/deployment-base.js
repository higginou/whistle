export function getAppBase(env = process.env) {
  return env.VERCEL ? '/' : '/whistle/'
}
