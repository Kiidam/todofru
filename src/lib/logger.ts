type Level = 'error' | 'warn' | 'info' | 'debug'

const levels: Level[] = ['error', 'warn', 'info', 'debug']

let runtimeLevel: Level | undefined

function currentLevel(): Level {
  // Read potential overrides safely (works in server and browser)
  const envLevelRaw = (typeof process !== 'undefined' && process?.env?.LOG_LEVEL ? String(process.env.LOG_LEVEL) : '').toLowerCase()
  const envLevel = levels.includes(envLevelRaw as Level) ? (envLevelRaw as Level) : undefined
  const isProd = typeof process !== 'undefined' && process?.env?.NODE_ENV === 'production'
  return runtimeLevel ?? envLevel ?? (isProd ? 'warn' : 'info')
}

function shouldLog(level: Level): boolean {
  const curr = currentLevel()
  return levels.indexOf(level) <= levels.indexOf(curr)
}

function safeSerialize(meta: unknown): unknown {
  if (meta === undefined) return undefined // preserve falsy values like 0, false, null
  if (meta instanceof Error) {
    return { name: meta.name, message: meta.message, stack: meta.stack }
  }
  try {
    return JSON.parse(JSON.stringify(meta))
  } catch {
    try { return String(meta) } catch { return '[unserializable]' }
  }
}

function format(message: string, meta?: unknown): string {
  const ts = new Date().toISOString()
  const base = `[${ts}] ${message}`
  if (meta === undefined) return base
  const serialized = safeSerialize(meta)
  const suffix = typeof serialized === 'string' ? serialized : JSON.stringify(serialized)
  return `${base} :: ${suffix}`
}

function emit(level: Level, message: string, meta?: unknown): void {
  if (!shouldLog(level)) return
  // Guard console in non-standard environments
  if (typeof console === 'undefined') return
  const text = format(message, meta)
  switch (level) {
    case 'error':
      if (typeof console.error === 'function') console.error(text)
      else if (typeof console.log === 'function') console.log(text)
      break
    case 'warn':
      if (typeof console.warn === 'function') console.warn(text)
      else if (typeof console.log === 'function') console.log(text)
      break
    case 'info':
      if (typeof console.log === 'function') console.log(text)
      break
    case 'debug':
      if (typeof console.debug === 'function') console.debug(text)
      else if (typeof console.log === 'function') console.log(text)
      break
  }
}

export const logger = {
  error(message: string, meta?: unknown) { emit('error', message, meta) },
  warn(message: string, meta?: unknown) { emit('warn', message, meta) },
  info(message: string, meta?: unknown) { emit('info', message, meta) },
  debug(message: string, meta?: unknown) { emit('debug', message, meta) },
  setLevel(level: Level) {
    if (!levels.includes(level)) return
    runtimeLevel = level
  }
}

export default logger