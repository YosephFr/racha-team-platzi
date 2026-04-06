import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import cookieParser from 'cookie-parser'
import multer from 'multer'
import rateLimit from 'express-rate-limit'
import { randomUUID } from 'crypto'
import { mkdirSync } from 'fs'
import { config } from './config.js'
import { initWhatsApp, shutdownWhatsApp } from './whatsapp/session-manager.js'
import { authRouter } from './routes/auth.js'
import { studyRouter } from './routes/study.js'
import { streaksRouter } from './routes/streaks.js'
import { whatsappRouter } from './routes/whatsapp.js'
import { chatRouter } from './routes/chat.js'
import { ttsRouter } from './routes/tts.js'
import { remindersRouter } from './routes/reminders.js'
import { db } from './db/index.js'

const app = express()

const allowedOrigins =
  config.allowedOrigins.length > 0
    ? config.allowedOrigins
    : [config.frontendUrl, 'http://localhost:4035']

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      cb(null, allowedOrigins.includes(origin))
    },
    credentials: true,
  })
)

app.disable('x-powered-by')

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  next()
})

app.use(express.json({ limit: '20mb' }))
app.use(cookieParser())

mkdirSync('./data/uploads', { recursive: true })

const SAFE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const MIME_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heif',
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, './data/uploads'),
    filename: (_req, file, cb) => {
      const ext = MIME_EXT[file.mimetype] || '.jpg'
      cb(null, `${randomUUID()}${ext}`)
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (SAFE_MIMES.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Solo JPEG, PNG o WebP'))
  },
})

app.use((req, _res, next) => {
  const token = req.cookies?.racha_token
  if (token) {
    try {
      req.user = jwt.verify(token, config.jwtSecret)
    } catch {}
  }
  if (!req.user) {
    const authHeader = req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      try {
        req.user = jwt.verify(authHeader.slice(7), config.jwtSecret)
      } catch {}
    }
  }
  next()
})

app.use('/uploads', express.static('./data/uploads'))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  keyGenerator: (req) => req.user?.userId || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
})

const costlyLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  keyGenerator: (req) => req.user?.userId || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
})

const studyLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  keyGenerator: (req) => req.user?.userId || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api/auth', authRouter)
app.use('/api/study', studyLimiter, upload.single('photo'), studyRouter)
app.use('/api/streaks', apiLimiter, streaksRouter)
app.use('/api/whatsapp', whatsappRouter)
app.use('/api/tts', costlyLimiter, ttsRouter)
app.use('/api/reminders', apiLimiter, remindersRouter)
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype.startsWith('audio/'))
  },
})
app.use('/api/chat', costlyLimiter, audioUpload.single('audio'), chatRouter)

app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' })
})

let isShuttingDown = false

async function shutdown(signal) {
  if (isShuttingDown) return
  isShuttingDown = true

  const forceExitTimer = setTimeout(() => {
    console.error('[shutdown] Force exit after 25s backstop')
    process.exit(1)
  }, 25000)
  forceExitTimer.unref()

  console.log(`[shutdown] ${signal} received, shutting down...`)

  try {
    await Promise.race([shutdownWhatsApp(), new Promise((r) => setTimeout(r, 20000))])
  } catch (err) {
    console.warn('[shutdown] WhatsApp shutdown error:', err.message)
  }

  try {
    db.close()
    console.log('[shutdown] Database closed')
  } catch {}

  console.log('[shutdown] Complete')
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

app.listen(config.port, () => {
  console.log(`[server] Backend running on port ${config.port}`)
  initWhatsApp()
})
