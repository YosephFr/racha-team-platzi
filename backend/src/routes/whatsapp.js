import { Router } from 'express'
import { getStatus, getLastQR } from '../whatsapp/session-manager.js'

export const whatsappRouter = Router()

whatsappRouter.get('/status', (_req, res) => {
  res.json({ status: getStatus(), hasQR: !!getLastQR() })
})

whatsappRouter.get('/qr', (_req, res) => {
  const qr = getLastQR()
  if (!qr) return res.status(404).json({ error: 'No QR disponible' })
  res.json({ qr })
})
