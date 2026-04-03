import { sendMessage, isReady } from './session-manager.js'
import { config } from '../config.js'

function formatTarget(target) {
  const cleaned = String(target).replace(/[^0-9@a-z._-]/gi, '')
  if (cleaned.includes('@')) return cleaned
  return `${cleaned}@c.us`
}

export async function notifyGroup(message) {
  if (!isReady()) {
    console.warn('[notify] WhatsApp not ready, skipping notification')
    return { sent: false, reason: 'whatsapp_not_ready' }
  }

  const targets = config.whatsapp.targets
  if (!targets.length) {
    console.warn('[notify] No targets configured')
    return { sent: false, reason: 'no_targets' }
  }

  const results = []
  for (const target of targets) {
    const chatId = formatTarget(target)
    try {
      await sendMessage(chatId, message)
      results.push({ target: chatId, sent: true })
    } catch (err) {
      console.error(`[notify] Failed to send to ${chatId}:`, err.message)
      results.push({ target: chatId, sent: false, error: err.message })
    }
  }

  return { sent: results.some((r) => r.sent), results }
}
