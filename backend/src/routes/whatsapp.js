import { Router } from 'express'
import { getStatus } from '../whatsapp/session-manager.js'

export const whatsappRouter = Router()

whatsappRouter.get('/status', (_req, res) => {
  res.json({ status: getStatus() })
})
