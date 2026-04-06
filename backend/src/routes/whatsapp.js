import { Router } from 'express'
import { getStatus } from '../whatsapp/session-manager.js'

export const whatsappRouter = Router()

whatsappRouter.get('/status', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' })
  res.json({ status: getStatus() })
})
