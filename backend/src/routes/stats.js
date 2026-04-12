import { Router } from 'express'
import { queries } from '../db/index.js'
import { getStreakInfo, getEffectiveDate } from '../services/streak.js'

export const statsRouter = Router()

statsRouter.get('/', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' })

  const userId = req.user.userId
  const sessions = queries.getUserSessions(userId, 100)
  const streakInfo = getStreakInfo(userId)
  const today = getEffectiveDate()

  const dailyStudy = []
  const courseMap = {}
  const hourMap = Array.from({ length: 24 }, () => 0)
  let totalMinutes = 0
  let totalClasses = 0

  for (const s of sessions) {
    if (!s.started_at) continue

    let durationMin = 0
    if (s.completed_at) {
      durationMin = Math.round((new Date(s.completed_at) - new Date(s.started_at)) / 60000)
      if (durationMin < 0 || durationMin > 480) durationMin = 0
    }

    const dateKey = s.started_at.split('T')[0] || s.started_at.split(' ')[0]
    const existing = dailyStudy.find((d) => d.date === dateKey)
    if (existing) {
      existing.minutes += durationMin
      existing.sessions += 1
      existing.classes += s.classes_completed || 0
    } else {
      dailyStudy.push({
        date: dateKey,
        minutes: durationMin,
        sessions: 1,
        classes: s.classes_completed || 0,
      })
    }

    const course = s.start_course || 'Sin curso'
    if (!courseMap[course]) courseMap[course] = { minutes: 0, sessions: 0, classes: 0 }
    courseMap[course].minutes += durationMin
    courseMap[course].sessions += 1
    courseMap[course].classes += s.classes_completed || 0

    const hour = new Date(s.started_at).getHours()
    if (!isNaN(hour)) hourMap[hour] += 1

    totalMinutes += durationMin
    totalClasses += s.classes_completed || 0
  }

  dailyStudy.sort((a, b) => a.date.localeCompare(b.date))

  const courses = Object.entries(courseMap)
    .map(([name, data]) => ({ name: name.replace(/^Curso de /, ''), ...data }))
    .sort((a, b) => b.minutes - a.minutes)

  const weeklyStudy = buildWeeklyData(dailyStudy, today)

  const avgSessionMin =
    sessions.length > 0 ? Math.round(totalMinutes / sessions.filter((s) => s.completed_at).length) : 0

  res.json({
    dailyStudy: dailyStudy.slice(-30),
    weeklyStudy,
    courses,
    hourDistribution: hourMap,
    summary: {
      totalMinutes,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      totalSessions: sessions.length,
      totalClasses,
      avgSessionMin: isFinite(avgSessionMin) ? avgSessionMin : 0,
      todayMinutes: dailyStudy.find((d) => d.date === today)?.minutes || 0,
    },
  })
})

function buildWeeklyData(dailyStudy, today) {
  const weeks = []
  const todayDate = new Date(today + 'T12:00:00')

  for (let w = 3; w >= 0; w--) {
    const weekStart = new Date(todayDate)
    weekStart.setDate(todayDate.getDate() - todayDate.getDay() - w * 7 + 1)

    let weekMinutes = 0
    let weekClasses = 0
    let weekSessions = 0

    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart)
      day.setDate(weekStart.getDate() + d)
      const dateStr =
        day.getFullYear() +
        '-' +
        String(day.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(day.getDate()).padStart(2, '0')
      const found = dailyStudy.find((ds) => ds.date === dateStr)
      if (found) {
        weekMinutes += found.minutes
        weekClasses += found.classes
        weekSessions += found.sessions
      }
    }

    const startStr =
      weekStart.getDate() +
      '/' +
      (weekStart.getMonth() + 1)

    weeks.push({ label: `Sem ${startStr}`, minutes: weekMinutes, classes: weekClasses, sessions: weekSessions })
  }

  return weeks
}
