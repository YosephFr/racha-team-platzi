import pkg from 'whatsapp-web.js'
const { Client, LocalAuth } = pkg
import { config } from '../config.js'
import { mkdirSync } from 'fs'

mkdirSync(config.whatsapp.sessionPath, { recursive: true })

const MAX_PAIRING_ATTEMPTS = 3
const AUTH_TIMEOUT_MS = 240000

export function createClient() {
  return new Client({
    authStrategy: new LocalAuth({
      dataPath: config.whatsapp.sessionPath,
      clientId: 'racha-team-platzi',
    }),
    webVersionCache: {
      type: 'local',
      path: config.whatsapp.cachePath,
    },
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-features=site-per-process',
        '--disable-dev-shm-usage',
      ],
    },
    authTimeoutMs: AUTH_TIMEOUT_MS,
    qrMaxRetries: 0,
  })
}

export function setupPairingAuth(client, phoneNumber) {
  return new Promise((resolve, reject) => {
    let pairingAttempts = 0
    let pairingRunning = false
    let resolved = false
    const cleanNumber = phoneNumber ? phoneNumber.replace(/[^0-9]/g, '') : ''

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true
        reject(new Error('Auth timeout (240s)'))
      }
    }, AUTH_TIMEOUT_MS)

    const cleanup = () => {
      clearTimeout(timeout)
      resolved = true
    }

    async function requestCode() {
      if (pairingRunning || resolved || !cleanNumber) return
      pairingAttempts++

      if (pairingAttempts > MAX_PAIRING_ATTEMPTS) {
        cleanup()
        reject(new Error(`Max pairing attempts (${MAX_PAIRING_ATTEMPTS}) reached`))
        return
      }

      pairingRunning = true
      try {
        if (client.pupPage && typeof client.pupPage.exposeFunction === 'function') {
          await client.pupPage.exposeFunction('onCodeReceivedEvent', (code) => code).catch(() => {})
        }

        const code = await client.requestPairingCode(cleanNumber, true, 180000)
        const trimmed = typeof code === 'string' ? code.trim() : ''
        if (!trimmed) throw new Error('Empty pairing code')

        const formatted = trimmed.match(/.{1,4}/g)?.join('-') || trimmed
        const masked = '****-' + formatted.slice(-4)
        console.log(`\n========================================`)
        console.log(`[whatsapp] Codigo de emparejamiento: ${masked}`)
        console.log(`[whatsapp] Ingresa este codigo en WhatsApp del numero ${cleanNumber}`)
        console.log(`[whatsapp] Intento ${pairingAttempts}/${MAX_PAIRING_ATTEMPTS}`)
        console.log(`========================================\n`)
      } catch (err) {
        console.error(
          `[whatsapp] Pairing code request failed (attempt ${pairingAttempts}):`,
          err.message
        )
        if (pairingAttempts >= MAX_PAIRING_ATTEMPTS) {
          cleanup()
          reject(err)
        }
      } finally {
        pairingRunning = false
      }
    }

    client.on('qr', () => {
      if (resolved) return
      if (!cleanNumber) {
        cleanup()
        reject(new Error('No WA_PRIMARY_PHONE configured'))
        return
      }
      requestCode().catch((err) => {
        console.error('[whatsapp] Pairing code error in qr handler:', err.message)
      })
    })

    client.on('ready', () => {
      if (resolved) return
      cleanup()
      resolve()
    })

    client.on('auth_failure', (msg) => {
      if (resolved) return
      cleanup()
      reject(new Error(`Auth failure: ${msg}`))
    })

    client.on('authenticated', () => {
      console.log('[whatsapp] Authenticated')
    })

    client.initialize().catch((err) => {
      if (!resolved) {
        cleanup()
        reject(err)
      }
    })
  })
}

export async function destroyClient(client) {
  if (!client) return
  try {
    await Promise.race([client.destroy(), new Promise((r) => setTimeout(r, 8000))])
  } catch (_) {}
  try {
    if (client.pupBrowser) {
      const proc = client.pupBrowser.process()
      if (proc) {
        proc.kill('SIGKILL')
        console.log('[whatsapp] Killed orphan browser process')
      }
    }
  } catch (_) {}
}
