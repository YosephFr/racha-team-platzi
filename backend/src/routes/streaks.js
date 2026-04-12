import { Router } from 'express'
import { getStreakInfo, calculateLeaderboardStreak } from '../services/streak.js'
import { queries } from '../db/index.js'

export const streaksRouter = Router()

streaksRouter.get('/', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' })
  const info = getStreakInfo(req.user.userId)
  const sessions = queries.getUserSessions(req.user.userId, 500)
  const allDays = info.calendar || []
  const completedDays = allDays.filter((d) => d.completed).length

  let bestStreak = 0
  let current = 0
  const sorted = allDays.slice().sort((a, b) => a.date.localeCompare(b.date))
  for (const day of sorted) {
    if (day.completed) {
      current++
      if (current > bestStreak) bestStreak = current
    } else {
      current = 0
    }
  }
  if (info.currentStreak > bestStreak) bestStreak = info.currentStreak

  res.json({
    ...info,
    bestStreak,
    totalDays: completedDays,
    totalSessions: sessions.length,
  })
})

streaksRouter.get('/leaderboard', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' })
  const users = queries.getAllUsers()
  const leaderboard = users
    .map((u) => ({
      id: u.id,
      name: u.name,
      avatarUrl: u.avatar_url,
      streak: calculateLeaderboardStreak(u.id),
    }))
    .sort((a, b) => b.streak - a.streak)

  res.json({ leaderboard })
})
