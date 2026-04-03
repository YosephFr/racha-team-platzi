import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { queries } from '../db/index.js'

export const authRouter = Router()

authRouter.post('/login', (req, res) => {
  const { email, name, avatarUrl } = req.body
  if (!email) {
    return res.status(400).json({ error: 'Email requerido' })
  }

  if (!config.bypassOAuth) {
    return res.status(501).json({ error: 'OAuth no implementado aun. Activar BYPASS_OAUTH=true' })
  }

  const user = queries.upsertUser(email, name || email.split('@')[0], avatarUrl || null)
  const token = jwt.sign({ userId: user.id, email: user.email }, config.jwtSecret, {
    expiresIn: '30d',
  })

  res.json({ user, token })
})

authRouter.get('/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado' })
  }
  const user = queries.getUserById(req.user.userId)
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' })
  }
  res.json({ user })
})
