import { Router } from 'express'
import cron from 'node-cron'
import { queries } from '../db/index.js'
import { isReady } from '../whatsapp/session-manager.js'
import { COUNTRY_TIMEZONES, config } from '../config.js'
import { runHeartbeat } from '../ai/engine.js'
import { getStreakInfo, getEffectiveDate } from '../services/streak.js'

export const remindersRouter = Router()

const VALID_COUNTRIES = Object.keys(COUNTRY_TIMEZONES)

remindersRouter.get('/', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' })
  const reminder = queries.getReminder(req.user.userId)
  res.json({ reminder: reminder || null })
})

remindersRouter.post('/', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' })

  const { phoneNumber, hour, minute, country } = req.body
  if (!phoneNumber || hour === undefined || minute === undefined || !country) {
    return res.status(400).json({ error: 'phoneNumber, hour, minute y country son requeridos' })
  }

  if (!VALID_COUNTRIES.includes(country)) {
    return res.status(400).json({ error: `Pais invalido. Opciones: ${VALID_COUNTRIES.join(', ')}` })
  }

  const h = Number(hour)
  const m = Number(minute)
  if (h < 0 || h > 23 || m < 0 || m > 59) {
    return res.status(400).json({ error: 'Hora invalida' })
  }

  const cleaned = String(phoneNumber).replace(/[^0-9+]/g, '')
  if (cleaned.length < 8) {
    return res.status(400).json({ error: 'Numero de telefono invalido' })
  }

  const timezone = COUNTRY_TIMEZONES[country]
  const reminder = queries.createReminder(req.user.userId, cleaned, h, m, country, timezone)
  res.json({ reminder })
})

remindersRouter.delete('/:id', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' })
  queries.deleteReminder(Number(req.params.id), req.user.userId)
  res.json({ ok: true })
})

remindersRouter.get('/countries', (_req, res) => {
  res.json({
    countries: VALID_COUNTRIES.map((code) => ({
      code,
      timezone: COUNTRY_TIMEZONES[code],
    })),
  })
})

async function sendAIReminder(userId, phoneNumber, reason) {
  if (!isReady()) {
    console.warn(`[reminders] WhatsApp not ready, skipping for user ${userId}`)
    return
  }

  const user = queries.getUserById(userId)
  const streakInfo = getStreakInfo(userId)
  const activeSession = queries.getActiveSession(userId)

  const systemMsg = `[SISTEMA] ${reason}
Datos del usuario: nombre="${user?.name || 'Usuario'}", racha=${streakInfo.currentStreak} dias, hoyCompletado=${streakInfo.todayCompleted}, sesionActiva=${!!activeSession}, telefono=${phoneNumber}.
Usa send_private_notification con phoneNumber="${phoneNumber}" para enviarle un mensaje. Se conciso, amigable, maximo 1 emoji.`

  try {
    await runHeartbeat(userId, systemMsg)
    console.log(`[reminders] AI reminder sent to user ${userId} (${reason})`)
  } catch (err) {
    console.error(`[reminders] AI reminder failed for user ${userId}:`, err.message)
  }
}

cron.schedule('* * * * *', async () => {
  const reminders = queries.getActiveReminders()
  if (!reminders.length) return

  const now = new Date()

  for (const reminder of reminders) {
    try {
      const tz = reminder.timezone || 'America/Argentina/Buenos_Aires'
      const userTime = new Date(now.toLocaleString('en-US', { timeZone: tz }))
      const currentHour = userTime.getHours()
      const currentMinute = userTime.getMinutes()

      if (currentHour === reminder.hour && currentMinute === reminder.minute) {
        const info = getStreakInfo(reminder.user_id)
        if (info.todayCompleted) {
          console.log(
            `[reminders] User ${reminder.user_id} already studied today, skipping scheduled reminder`
          )
          continue
        }
        await sendAIReminder(
          reminder.user_id,
          reminder.phone_number,
          `Recordatorio programado de las ${String(reminder.hour).padStart(2, '0')}:${String(reminder.minute).padStart(2, '0')}`
        )
      }

      if (currentHour === 22 && currentMinute === 0) {
        const streakInfo = getStreakInfo(reminder.user_id)
        if (!streakInfo.todayCompleted) {
          await sendAIReminder(
            reminder.user_id,
            reminder.phone_number,
            'Alerta nocturna: son las 10pm y el usuario NO ha estudiado hoy. Motivalo a hacer aunque sea una clase rapida.'
          )
        }
      }
    } catch (err) {
      console.error(`[reminders] Error for user ${reminder.user_id}:`, err.message)
    }
  }

  try {
    const allUsers = queries.getAllUsers()
    for (const user of allUsers) {
      const active = queries.getActiveSession(user.id)
      if (!active?.started_at) continue

      const startedAt = new Date(active.started_at)
      const elapsed = (now - startedAt) / 1000 / 60
      if (elapsed >= 120 && elapsed < 121) {
        const reminder = queries.getReminder(user.id)
        if (reminder) {
          await sendAIReminder(
            user.id,
            reminder.phone_number,
            'El usuario lleva mas de 2 horas con una sesion de estudio abierta sin cerrar. Recuerdale amablemente que la cierre.'
          )
        }
      }
    }
  } catch (err) {
    console.error('[reminders] Error checking open sessions:', err.message)
  }
})

console.log('[reminders] Cron scheduler initialized (every minute)')
