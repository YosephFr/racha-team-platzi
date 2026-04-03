import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import { mkdirSync } from 'fs'
import { config } from './config.js'
import { initWhatsApp, getStatus } from './whatsapp/session-manager.js'
import { authRouter } from './routes/auth.js'
import { studyRouter } from './routes/study.js'
import { streaksRouter } from './routes/streaks.js'
import { whatsappRouter } from './routes/whatsapp.js'
import { chatRouter } from './routes/chat.js'
import { ttsRouter } from './routes/tts.js'
import { remindersRouter } from './routes/reminders.js'

const app = express()

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      if (
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        /https?:\/\/100\./.test(origin) ||
        /https?:\/\/192\.168\./.test(origin)
      ) {
        return cb(null, true)
      }
      if (origin === config.frontendUrl) return cb(null, true)
      cb(null, false)
    },
  })
)
app.use(express.json({ limit: '20mb' }))

mkdirSync('./data/uploads', { recursive: true })
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, './data/uploads'),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Solo imagenes permitidas'))
  },
})

app.use((req, _res, next) => {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(authHeader.slice(7), config.jwtSecret)
    } catch {}
  }
  next()
})

app.use('/uploads', express.static('./data/uploads'))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', whatsapp: getStatus() })
})

app.use('/api/auth', authRouter)
app.use('/api/study', upload.single('photo'), studyRouter)
app.use('/api/streaks', streaksRouter)
app.use('/api/whatsapp', whatsappRouter)
app.use('/api/tts', ttsRouter)
app.use('/api/reminders', remindersRouter)
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
})
app.use('/api/chat', audioUpload.single('audio'), chatRouter)

app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' })
})

app.listen(config.port, () => {
  console.log(`[server] Backend running on port ${config.port}`)
  initWhatsApp()
})
