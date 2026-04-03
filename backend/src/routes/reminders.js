import { Router } from 'express'
import cron from 'node-cron'
import { queries } from '../db/index.js'
import { sendMessage, isReady } from '../whatsapp/session-manager.js'
import { COUNTRY_TIMEZONES } from '../config.js'

export const remindersRouter = Router()

const VALID_COUNTRIES = Object.keys(COUNTRY_TIMEZONES)

const COUNTRY_PREFIXES = {
  AR: '+54',
  CO: '+57',
  PE: '+51',
}

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
      prefix: COUNTRY_PREFIXES[code],
      timezone: COUNTRY_TIMEZONES[code],
    })),
  })
})

const REMINDER_MESSAGES = [
  'Hey {name}! Ya es hora de estudiar en Platzi. Tu racha te espera!',
  '{name}, no dejes que se apague la llama! Hora de sumar un dia mas a tu racha.',
  'Ey {name}! Platzi te extrana. Vamos a estudiar un ratito?',
  '{name}! Recordatorio amigable: tu racha no se mantiene sola. A estudiar!',
  'Hola {name}! Hoy es un gran dia para aprender algo nuevo en Platzi.',
  '{name}, tu yo del futuro te va a agradecer si estudias hoy. Dale!',
]

function getRandomMessage(name) {
  const msg = REMINDER_MESSAGES[Math.floor(Math.random() * REMINDER_MESSAGES.length)]
  return msg.replace('{name}', name || 'crack')
}

function formatPhoneForWA(phone) {
  const digits = phone.replace(/[^0-9]/g, '')
  return `${digits}@c.us`
}

cron.schedule('* * * * *', async () => {
  const reminders = queries.getActiveReminders()
  if (!reminders.length) return

  for (const reminder of reminders) {
    try {
      const now = new Date()
      const tz = reminder.timezone || 'America/Argentina/Buenos_Aires'
      const userTime = new Date(now.toLocaleString('en-US', { timeZone: tz }))
      const currentHour = userTime.getHours()
      const currentMinute = userTime.getMinutes()

      if (currentHour === reminder.hour && currentMinute === reminder.minute) {
        if (!isReady()) {
          console.warn(
            `[reminders] WhatsApp not ready, skipping reminder for user ${reminder.user_id}`
          )
          continue
        }

        const message = getRandomMessage(reminder.user_name)
        const chatId = formatPhoneForWA(reminder.phone_number)
        await sendMessage(chatId, message)
        console.log(`[reminders] Sent to ${chatId} for ${reminder.user_name}`)
      }
    } catch (err) {
      console.error(`[reminders] Error for user ${reminder.user_id}:`, err.message)
    }
  }
})

console.log('[reminders] Cron scheduler initialized (every minute)')
