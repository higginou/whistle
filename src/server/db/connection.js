import postgres from 'postgres'

const POSTGRES_URL_KEYS = ['POSTGRES_URL', 'DATABASE_URL']

function isPostgresUrl(value) {
  try {
    const url = new URL(value)

    return url.protocol === 'postgres:' || url.protocol === 'postgresql:'
  } catch {
    return false
  }
}

export function getPostgresUrl(env = process.env) {
  for (const key of POSTGRES_URL_KEYS) {
    const value = env[key]

    if (typeof value === 'string' && isPostgresUrl(value.trim())) {
      return value.trim()
    }
  }

  return null
}

export function requirePostgresUrl(env = process.env) {
  const url = getPostgresUrl(env)

  if (!url) {
    throw new Error('Vercel Postgres needs POSTGRES_URL or DATABASE_URL configured in environment variables')
  }

  return url
}

export function createPostgresConnectionConfig(env = process.env) {
  return {
    connectionString: requirePostgresUrl(env),
  }
}

export function createPostgresClient(env = process.env, options = {}) {
  return postgres(requirePostgresUrl(env), {
    max: 1,
    idle_timeout: 20,
    ...options,
  })
}
