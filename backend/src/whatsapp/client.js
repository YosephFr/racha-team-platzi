import pkg from 'whatsapp-web.js'
const { Client, LocalAuth } = pkg
import { config } from '../config.js'
import { mkdirSync } from 'fs'

mkdirSync(config.whatsapp.sessionPath, { recursive: true })

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
    authTimeoutMs: 60000,
    qrMaxRetries: 6,
  })
}
