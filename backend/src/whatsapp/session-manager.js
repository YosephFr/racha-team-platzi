import qrTerminal from 'qrcode-terminal'
import { createClient } from './client.js'

const MAX_RECONNECT_ATTEMPTS = 3
const RECONNECT_DELAY_MS = 10000

let client = null
let status = 'disconnected'
let lastQR = null
let reconnectAttempts = 0
let reconnectTimer = null

export function getStatus() {
  return status
}

export function getLastQR() {
  return lastQR
}

export function getClient() {
  return client
}

export function isReady() {
  return status === 'ready'
}

async function scheduleReconnect(reason) {
  // LOGOUT is intentional -- don't reconnect, just reset
  if (reason === 'LOGOUT') {
    console.log('[whatsapp] Logout detected, not reconnecting. Restart the server to re-pair.')
    status = 'disconnected'
    return
  }

  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('[whatsapp] Max reconnect attempts reached')
    status = 'error'
    return
  }

  reconnectAttempts++
  const delay = RECONNECT_DELAY_MS * reconnectAttempts
  console.log(`[whatsapp] Scheduling reconnect attempt ${reconnectAttempts} in ${delay}ms`)

  reconnectTimer = setTimeout(async () => {
    try {
      // Destroy old client and create fresh one
      status = 'reconnecting'
      try {
        await client.destroy()
      } catch (_) {}
      client = createClient()
      bindEvents(client)
      await client.initialize()
    } catch (err) {
      console.error('[whatsapp] Reconnect failed:', err.message)
      status = 'error'
    }
  }, delay)
}

function bindEvents(c) {
  c.on('qr', (qr) => {
    lastQR = qr
    status = 'waiting_qr'
    console.log('[whatsapp] QR code generated — scan to authenticate:')
    qrTerminal.default
      ? qrTerminal.default.generate(qr, { small: true })
      : qrTerminal.generate(qr, { small: true })
  })

  c.on('authenticated', () => {
    status = 'authenticated'
    lastQR = null
    console.log('[whatsapp] Authenticated')
  })

  c.on('ready', () => {
    status = 'ready'
    reconnectAttempts = 0
    console.log('[whatsapp] Client ready')
  })

  c.on('auth_failure', (msg) => {
    status = 'auth_failure'
    console.error('[whatsapp] Auth failure:', msg)
  })

  c.on('message', async (msg) => {
    try {
      const chat = await msg.getChat()
      if (!chat.isGroup) return
      const contact = await msg.getContact()
      const sender = contact.pushname || contact.number || msg.author || 'unknown'
      const preview = (msg.body || '').slice(0, 80)
      console.log(
        `[whatsapp-incoming] Group: ${chat.name} | ID: ${chat.id._serialized} | From: ${sender} | Message: ${preview}`
      )
    } catch (err) {
      console.error('[whatsapp-incoming] Error processing message:', err.message)
    }
  })

  c.on('disconnected', (reason) => {
    status = 'disconnected'
    console.warn('[whatsapp] Disconnected:', reason)

    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

    scheduleReconnect(reason)
  })
}

export async function initWhatsApp() {
  client = createClient()
  bindEvents(client)

  try {
    console.log('[whatsapp] Initializing...')
    await client.initialize()
  } catch (err) {
    status = 'error'
    console.error('[whatsapp] Initialization failed:', err.message)
  }
}

export async function sendMessage(chatId, message) {
  if (status !== 'ready') {
    throw new Error(`WhatsApp not ready (status: ${status})`)
  }
  return client.sendMessage(chatId, message)
}

export async function destroySession() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (client) {
    try {
      await client.destroy()
    } catch (err) {
      console.warn('[whatsapp] Destroy error:', err.message)
    }
    client = null
    status = 'disconnected'
  }
}
