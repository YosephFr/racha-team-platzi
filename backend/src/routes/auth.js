import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { queries } from '../db/index.js'

export const authRouter = Router()

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

function getCallbackUrl() {
  return `${config.frontendUrl}/api/auth/google/callback`
}

function createToken(user) {
  return jwt.sign({ userId: user.id, email: user.email }, config.jwtSecret, {
    expiresIn: '30d',
  })
}

authRouter.get('/google', (_req, res) => {
  const params = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: getCallbackUrl(),
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  })
  res.redirect(`${GOOGLE_AUTH_URL}?${params}`)
})

authRouter.get('/google/callback', async (req, res) => {
  const { code, error } = req.query
  if (error || !code) {
    return res.redirect(`${config.frontendUrl}/login?error=auth_cancelled`)
  }

  try {
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        redirect_uri: getCallbackUrl(),
        grant_type: 'authorization_code',
      }),
    })
    const tokens = await tokenRes.json()
    if (!tokens.access_token) throw new Error('No access token')

    const profileRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const profile = await profileRes.json()
    if (!profile.email) throw new Error('No email from Google')

    const user = queries.upsertUser(profile.email, profile.name || profile.email, profile.picture)
    const token = createToken(user)

    res.redirect(`${config.frontendUrl}/login?token=${token}`)
  } catch (err) {
    console.error('[auth] Google OAuth error:', err.message)
    res.redirect(`${config.frontendUrl}/login?error=auth_failed`)
  }
})

authRouter.post('/login', (req, res) => {
  const { email, name, avatarUrl } = req.body
  if (!email) {
    return res.status(400).json({ error: 'Email requerido' })
  }

  if (!config.bypassOAuth) {
    return res.status(501).json({ error: 'Usa Google para iniciar sesion' })
  }

  const user = queries.upsertUser(email, name || email.split('@')[0], avatarUrl || null)
  const token = createToken(user)
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
