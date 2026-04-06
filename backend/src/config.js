import 'dotenv/config'

function parseDays(str, fallback) {
  if (!str) return fallback
  const result = str
    .split(',')
    .map((d) => Number(d.trim()))
    .filter((d) => !isNaN(d))
  return result.length ? result : fallback
}

function parseDates(str) {
  if (!str) return []
  return str
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean)
}

function parseTargets(str) {
  if (!str) return []
  return str
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required')
  process.exit(1)
}

export const config = {
  port: Number(process.env.BACKEND_PORT) || 4036,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4035',
  jwtSecret: process.env.JWT_SECRET,
  bypassOAuth: process.env.BYPASS_OAUTH === 'true',
  allowedOrigins: parseTargets(process.env.CORS_ORIGINS),
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },
  db: {
    path: process.env.DATABASE_PATH || './data/racha.db',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    visionModel: process.env.OPENAI_VISION_MODEL || 'gpt-4o',
    chatModel: process.env.OPENAI_CHAT_MODEL || 'gpt-5.4-mini',
    reasoningEffort: process.env.OPENAI_REASONING_EFFORT || 'medium',
  },
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY,
    voiceId: process.env.ELEVENLABS_VOICE_ID || 'REDACTED_VOICE_ID',
    model: process.env.ELEVENLABS_MODEL || 'eleven_v3',
  },
  streak: {
    requiredDays: parseDays(process.env.STREAK_REQUIRED_DAYS, [1, 2, 3, 4, 5]),
    optionalDays: parseDays(process.env.STREAK_OPTIONAL_DAYS, [6, 0]),
    excludedDates: parseDates(process.env.STREAK_EXCLUDED_DATES),
    resetHour: Number(process.env.STREAK_RESET_HOUR) || 4,
    timezone: process.env.STREAK_TIMEZONE || 'America/Argentina/Buenos_Aires',
  },
  whatsapp: {
    targets: parseTargets(process.env.WA_NOTIFY_TARGETS),
    sessionPath: process.env.WA_SESSION_PATH || './data/.wwebjs_auth',
    cachePath: process.env.WA_CACHE_PATH || './data/.wwebjs_cache',
    primaryPhone: process.env.WA_PRIMARY_PHONE || '',
    logMessages: process.env.WA_LOG_MESSAGES === 'true',
  },
}

export const COUNTRY_TIMEZONES = {
  AR: 'America/Argentina/Buenos_Aires',
  CO: 'America/Bogota',
  PE: 'America/Lima',
}
