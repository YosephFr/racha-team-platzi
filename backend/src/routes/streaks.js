import { Router } from 'express'
import { getStreakInfo, calculateStreak } from '../services/streak.js'
import { queries } from '../db/index.js'

export const streaksRouter = Router()

streaksRouter.get('/', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' })
  const info = getStreakInfo(req.user.userId)
  res.json(info)
})

streaksRouter.get('/leaderboard', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' })
  const users = queries.getAllUsers()
  const leaderboard = users
    .map((u) => ({
      id: u.id,
      name: u.name,
      avatarUrl: u.avatar_url,
      streak: calculateStreak(u.id),
    }))
    .sort((a, b) => b.streak - a.streak)

  res.json({ leaderboard })
})
