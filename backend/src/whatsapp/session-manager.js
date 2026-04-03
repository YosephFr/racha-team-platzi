import { config } from '../config.js'
import { createClient, setupPairingAuth, destroyClient } from './client.js'

const MAX_RECONNECT_ATTEMPTS = 3
const RECONNECT_DELAY_MS = 10000
const HEALTH_CHECK_INTERVAL_MS = 60000
const HEALTH_CHECK_TIMEOUT_MS = 10000

let client = null
let status = 'disconnected'
let reconnectAttempts = 0
let reconnectTimer = null
let healthCheckTimer = null

export function getStatus() {
  return status
}

export function getClient() {
  return client
}

export function isReady() {
  return status === 'ready'
}

function startHealthCheck() {
  stopHealthCheck()
  healthCheckTimer = setInterval(async () => {
    if (status !== 'ready' || !client) return
    try {
      await Promise.race([
        client.pupPage.evaluate(() => true),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), HEALTH_CHECK_TIMEOUT_MS)
        ),
      ])
    } catch (err) {
      const msg = err.message || ''
      if (
        msg.includes('detached Frame') ||
        msg.includes('target closed') ||
        msg.includes('session closed') ||
        msg.includes('Protocol error') ||
        msg.includes('Health check timeout')
      ) {
        console.error('[whatsapp] Health check failed, reinitializing:', msg)
        await reinitSession()
      }
    }
  }, HEALTH_CHECK_INTERVAL_MS)
}

function stopHealthCheck() {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer)
    healthCheckTimer = null
  }
}

function bindEvents(c) {
  c.on('ready', () => {
    status = 'ready'
    reconnectAttempts = 0
    console.log('[whatsapp] Client ready')
    startHealthCheck()
  })

  c.on('auth_failure', (msg) => {
    status = 'auth_failure'
    console.error('[whatsapp] Auth failure:', msg)
  })

  if (config.whatsapp.logMessages) {
    c.on('message', async (msg) => {
      try {
        const chat = await msg.getChat()
        const isGroup = chat.isGroup
        const contact = await msg.getContact()
        const sender = contact.pushname || contact.number || msg.author || 'unknown'
        const preview = (msg.body || '').slice(0, 120)
        const chatId = chat.id._serialized

        if (isGroup) {
          console.log(`[wa-msg] GROUP "${chat.name}" (${chatId}) | From: ${sender} | ${preview}`)
        } else {
          console.log(`[wa-msg] PRIVATE ${sender} (${chatId}) | ${preview}`)
        }
      } catch (err) {
        console.error('[wa-msg] Error processing:', err.message)
      }
    })
  }

  c.on('disconnected', (reason) => {
    status = 'disconnected'
    stopHealthCheck()
    console.warn('[whatsapp] Disconnected:', reason)

    if (reason === 'LOGOUT') {
      console.log('[whatsapp] Logout detected, not reconnecting. Restart to re-pair.')
      return
    }

    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

    scheduleReconnect()
  })
}

async function reinitSession() {
  console.log('[whatsapp] Reinitializing session...')
  stopHealthCheck()
  status = 'reconnecting'

  await destroyClient(client)

  try {
    client = createClient()
    bindEvents(client)

    const phoneNumber = config.whatsapp.primaryPhone
    if (phoneNumber) {
      await setupPairingAuth(client, phoneNumber)
    } else {
      await client.initialize()
    }

    status = 'ready'
    reconnectAttempts = 0
    startHealthCheck()
    console.log('[whatsapp] Reinitialization complete')
  } catch (err) {
    console.error('[whatsapp] Reinitialization failed:', err.message)
    status = 'error'
  }
}

async function scheduleReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('[whatsapp] Max reconnect attempts reached')
    status = 'error'
    return
  }

  reconnectAttempts++
  const delay = RECONNECT_DELAY_MS * reconnectAttempts
  console.log(`[whatsapp] Scheduling reconnect attempt ${reconnectAttempts} in ${delay}ms`)

  reconnectTimer = setTimeout(async () => {
    await reinitSession()
  }, delay)
}

export async function initWhatsApp() {
  const phoneNumber = config.whatsapp.primaryPhone
  client = createClient()
  bindEvents(client)

  try {
    console.log('[whatsapp] Initializing...')
    if (phoneNumber) {
      console.log(`[whatsapp] Using pairing code auth for ${phoneNumber}`)
      await setupPairingAuth(client, phoneNumber)
    } else {
      console.warn('[whatsapp] No WA_PRIMARY_PHONE set, using QR auth (deprecated)')
      await client.initialize()
    }
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

export async function shutdownWhatsApp() {
  console.log('[whatsapp] Shutting down...')
  stopHealthCheck()
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  await destroyClient(client)
  client = null
  status = 'disconnected'
  console.log('[whatsapp] Shutdown complete')
}
